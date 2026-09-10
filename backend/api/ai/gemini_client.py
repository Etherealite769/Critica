# backend/api/ai/gemini_client.py
import json
import logging
import os
import time
from typing import Dict, Any, Optional, Type, List
from pydantic import BaseModel
from django.conf import settings

from .schemas import (
    LogicThreadSessionBatchSchema,
    SnapGapSessionBatchSchema,
    TapCluesSessionBatchSchema,
    FactScannerSessionBatchSchema,
)

logger = logging.getLogger(__name__)

MODULE_SCHEMA_MAP: Dict[str, Type[BaseModel]] = {
    'logic_thread': LogicThreadSessionBatchSchema,
    'snap_gap': SnapGapSessionBatchSchema,
    'tap_clues': TapCluesSessionBatchSchema,
    'fact_scanner': FactScannerSessionBatchSchema,
}

PRIMARY_MODEL = os.getenv('GEMINI_MODEL', 'gemini-flash-latest')
FALLBACK_MODELS = [PRIMARY_MODEL, 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite']
# Deduplicate while preserving order
MODEL_CASCADE = list(dict.fromkeys(FALLBACK_MODELS))


class GeminiClient:
    """
    Unified Google Gemini API Client supporting structured JSON output,
    multi-model fallback cascade, live Socratic hints, and robust error handling.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or getattr(settings, 'GEMINI_API_KEY', None) or os.getenv('GEMINI_API_KEY', '')
        self.client = None
        self.sdk_type = "none"
        self._init_sdk()

    def _init_sdk(self):
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not configured in settings or environment variables.")
            return

        # Attempt to use modern google-genai first
        try:
            from google import genai
            self.client = genai.Client(api_key=self.api_key)
            self.sdk_type = "google-genai"
            logger.info("Initialized google-genai client.")
            return
        except ImportError:
            pass

        # Fallback to google-generativeai
        try:
            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=self.api_key)
            self.client = legacy_genai
            self.sdk_type = "google-generativeai"
            logger.info("Initialized google-generativeai client.")
        except ImportError:
            self.client = None
            self.sdk_type = "none"
            logger.error("Neither google-genai nor google-generativeai SDK is installed.")

    def is_available(self) -> bool:
        return bool(self.api_key and self.client)

    def generate_structured_session(
        self,
        module: str,
        system_instruction: str,
        user_prompt: str,
        temperature: float = 0.85,
        max_output_tokens: int = 8192,
    ) -> Optional[Dict[str, Any]]:
        """
        Calls Gemini API with structured JSON Schema constraint matching the module.
        Cascades through candidate models if the primary model fails or is rate-limited.
        Returns parsed Python dictionary with generation metadata or None if generation failed.
        """
        if not self.is_available():
            logger.warning("GeminiClient: Cannot generate - API key or SDK unavailable.")
            return None

        schema_cls = MODULE_SCHEMA_MAP.get(module)
        if not schema_cls:
            logger.error(f"No schema mapping found for module '{module}'")
            return None

        for model_name in MODEL_CASCADE:
            start_time = time.time()
            try:
                # Call with google-genai
                if self.sdk_type == "google-genai":
                    from google.genai import types
                    try:
                        response = self.client.models.generate_content(
                            model=model_name,
                            contents=user_prompt,
                            config=types.GenerateContentConfig(
                                system_instruction=system_instruction,
                                response_mime_type="application/json",
                                response_schema=schema_cls,
                                temperature=temperature,
                                max_output_tokens=max_output_tokens,
                            ),
                        )
                    except Exception as schema_err:
                        err_str = str(schema_err)
                        if "additionalProperties" in err_str or "400" in err_str:
                            logger.info(f"Retrying {model_name} with JSON mode without schema constraint due to API limitation: {err_str[:120]}")
                            schema_hint = f"\n\nReturn strict JSON adhering to the following schema definition:\n{json.dumps(schema_cls.model_json_schema())}"
                            response = self.client.models.generate_content(
                                model=model_name,
                                contents=f"{user_prompt}{schema_hint}",
                                config=types.GenerateContentConfig(
                                    system_instruction=system_instruction,
                                    response_mime_type="application/json",
                                    temperature=temperature,
                                    max_output_tokens=max_output_tokens,
                                ),
                            )
                        else:
                            raise schema_err

                    if response and response.text:
                        parsed = json.loads(response.text)
                        try:
                            validated = schema_cls.model_validate(parsed)
                            parsed = validated.model_dump()
                        except Exception as val_err:
                            logger.warning(f"Pydantic validation note: {val_err}")
                        elapsed = time.time() - start_time
                        logger.info(f"GeminiClient: Generated batch via {model_name} in {elapsed:.2f}s")
                        parsed['_model_used'] = model_name
                        parsed['_latency_ms'] = int(elapsed * 1000)
                        return parsed

                # Call with google-generativeai fallback
                elif self.sdk_type == "google-generativeai":
                    try:
                        model = self.client.GenerativeModel(
                            model_name=model_name,
                            system_instruction=system_instruction,
                            generation_config={
                                "response_mime_type": "application/json",
                                "response_schema": schema_cls,
                                "temperature": temperature,
                                "max_output_tokens": max_output_tokens,
                            }
                        )
                        response = model.generate_content(user_prompt)
                    except Exception as legacy_err:
                        model = self.client.GenerativeModel(
                            model_name=model_name,
                            system_instruction=system_instruction,
                            generation_config={
                                "response_mime_type": "application/json",
                                "temperature": temperature,
                                "max_output_tokens": max_output_tokens,
                            }
                        )
                        schema_hint = f"\n\nReturn strict JSON adhering to the following schema definition:\n{json.dumps(schema_cls.model_json_schema())}"
                        response = model.generate_content(f"{user_prompt}{schema_hint}")

                    if response and response.text:
                        parsed = json.loads(response.text)
                        try:
                            validated = schema_cls.model_validate(parsed)
                            parsed = validated.model_dump()
                        except Exception as val_err:
                            logger.warning(f"Pydantic validation note: {val_err}")
                        elapsed = time.time() - start_time
                        logger.info(f"GeminiClient: Generated batch via {model_name} in {elapsed:.2f}s")
                        parsed['_model_used'] = model_name
                        parsed['_latency_ms'] = int(elapsed * 1000)
                        return parsed

            except Exception as e:
                logger.warning(f"Gemini generation failed for model {model_name}: {e}. Retrying next model in cascade...")

        logger.error("GeminiClient: All models in cascade failed.")
        return None

    def generate_live_socratic_hint(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_output_tokens: int = 350,
    ) -> Optional[str]:
        """
        Generates a fast, real-time Socratic hint tailored to the student's current board state.
        """
        if not self.is_available():
            return None

        for model_name in MODEL_CASCADE:
            try:
                if self.sdk_type == "google-genai":
                    response = self.client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config={"temperature": temperature, "max_output_tokens": max_output_tokens},
                    )
                    if response and response.text:
                        return response.text.strip()

                elif self.sdk_type == "google-generativeai":
                    model = self.client.GenerativeModel(model_name=model_name)
                    response = model.generate_content(prompt)
                    if response and response.text:
                        return response.text.strip()

            except Exception as e:
                logger.warning(f"Socratic hint generation failed on {model_name}: {e}")

        return None
