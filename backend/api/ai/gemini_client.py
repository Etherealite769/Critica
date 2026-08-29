# backend/api/ai/gemini_client.py
import json
import logging
import os
from typing import Dict, Any, Optional, Type
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

DEFAULT_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')


class GeminiClient:
    """
    Unified Google Gemini API Client supporting structured JSON output,
    automatic fallback between SDKs, and error logging.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or getattr(settings, 'GEMINI_API_KEY', None) or os.getenv('GEMINI_API_KEY', '')
        self.client = None
        self._init_sdk()

    def _init_sdk(self):
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not configured in settings or environment variables.")
            return

        # Attempt to use google-genai first
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
        temperature: float = 0.7,
        max_output_tokens: int = 4096,
    ) -> Optional[Dict[str, Any]]:
        """
        Calls Gemini API with structured JSON Schema constraint matching the module.
        Returns the parsed Python dictionary or None if generation failed.
        """
        if not self.is_available():
            logger.warning("GeminiClient: Cannot generate - API key or SDK unavailable.")
            return None

        schema_cls = MODULE_SCHEMA_MAP.get(module)
        if not schema_cls:
            logger.error(f"No schema mapping found for module '{module}'")
            return None

        # Call with google-genai
        if self.sdk_type == "google-genai":
            try:
                from google.genai import types
                response = self.client.models.generate_content(
                    model=DEFAULT_MODEL,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=schema_cls,
                        temperature=temperature,
                        max_output_tokens=max_output_tokens,
                    ),
                )
                if response and response.text:
                    parsed = json.loads(response.text)
                    return parsed
            except Exception as e:
                logger.error(f"Gemini API error (google-genai): {e}")

        # Call with google-generativeai fallback
        elif self.sdk_type == "google-generativeai":
            try:
                model = self.client.GenerativeModel(
                    model_name=DEFAULT_MODEL,
                    system_instruction=system_instruction,
                    generation_config={
                        "response_mime_type": "application/json",
                        "response_schema": schema_cls,
                        "temperature": temperature,
                        "max_output_tokens": max_output_tokens,
                    }
                )
                response = model.generate_content(user_prompt)
                if response and response.text:
                    parsed = json.loads(response.text)
                    return parsed
            except Exception as e:
                logger.error(f"Gemini API error (google-generativeai): {e}")

        return None
