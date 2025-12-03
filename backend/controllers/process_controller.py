import json
import asyncio
from typing import AsyncGenerator

from services.pipeline_service import PipelineService


class ProcessController:
    def __init__(self):
        self.pipeline_service = PipelineService()

    async def process_stream(self, article: str) -> AsyncGenerator[str, None]:
        """
        SSE stream:
        - loglarni darhol yuboradi: {"type": "log", "message": "..."}
        - yakunda natijani yuboradi: {"type": "result", "payload": {...}}
        - oxirida: data: [DONE]
        """
        queue: asyncio.Queue[str] = asyncio.Queue()

        # Pipeline ichiga beriladigan callback
        def log_callback(msg: str):
            try:
                queue.put_nowait(
                    json.dumps(
                        {"type": "log", "message": msg},
                        ensure_ascii=False,
                    )
                )
            except RuntimeError:
                # queue yopilayotgan bo'lsa, pipeline yiqilmasin
                pass

        async def run_pipeline():
            try:
                # sync pipeline'ni background thread’da ishlatamiz
                result = await asyncio.to_thread(
                    self.pipeline_service.process_article,
                    article=article,
                    log_callback=log_callback,
                )

                # Yakuniy natija – FRONTEND KUTGAN FORMATDA
                await queue.put(
                    json.dumps(
                        {"type": "result", "payload": result},
                        ensure_ascii=False,
                    )
                )
            except Exception as e:
                # SSE orqali xato jo'natamiz
                await queue.put(
                    json.dumps(
                        {"type": "error", "message": str(e)},
                        ensure_ascii=False,
                    )
                )
            finally:
                # Stream yakuni
                await queue.put("[DONE]")

        # Pipeline taskini fon’da ishga tushiramiz
        asyncio.create_task(run_pipeline())

        # Navbat bilan queue'dan olib SSE blok qilib yuboramiz
        while True:
            data = await queue.get()

            if data == "[DONE]":
                # DONE event
                yield "data: [DONE]\n\n"
                break

            # Oddiy event
            yield f"data: {data}\n\n"

    async def fetch_current_card(self, article: str) -> dict | None:
        return await asyncio.to_thread(
            self.pipeline_service.get_current_card,
            article=article,
        )
