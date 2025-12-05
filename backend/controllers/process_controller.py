import json
import asyncio
import time
from typing import AsyncGenerator, Any

from sqlalchemy.orm import Session

from services.pipeline_service import PipelineService
from repositories.history_repository import HistoryRepository


class ProcessController:
    def __init__(self):
        self.pipeline_service = PipelineService()

    async def process_stream(
        self,
        article: str,
        user,
        db: Session,
    ) -> AsyncGenerator[str, None]:
        queue: asyncio.Queue[str] = asyncio.Queue()

        # log callback – pipeline ichidan chaqiriladi
        def log_callback(msg: str):
            try:
                queue.put_nowait(
                    json.dumps(
                        {"type": "log", "message": msg},
                        ensure_ascii=False,
                    )
                )
            except RuntimeError:
                # queue yopilayotganda xotirjam o'tkazib yuboramiz
                pass

        async def run_pipeline():
            start = time.perf_counter()
            status = "completed"
            error_message: str | None = None
            result: dict[str, Any] | None = None

            try:
                # sync pipeline'ni background thread'da ishlatamiz
                result = await asyncio.to_thread(
                    self.pipeline_service.process_article,
                    article=article,
                    log_callback=log_callback,
                )

                # FRONTEND kutayotgan final natija
                await queue.put(
                    json.dumps(
                        {"type": "result", "payload": result},
                        ensure_ascii=False,
                    )
                )

            except Exception as e:
                status = "failed"
                error_message = str(e)

                # SSE orqali xato
                await queue.put(
                    json.dumps(
                        {"type": "error", "message": error_message},
                        ensure_ascii=False,
                    )
                )

            finally:
                processing_time = time.perf_counter() - start

                # === HISTORY GA YOZISH ===
                try:
                    user_id = getattr(user, "id", None)
                    if user_id is None and isinstance(user, dict):
                        user_id = user.get("id")

                    if user_id is not None:
                        repo = HistoryRepository(db)

                        if result is not None:
                            # PipelineService.process_article natijalari asosida
                            repo.create_history(
                                user_id=user_id,
                                article=article,
                                nm_id=result.get("nmID"),
                                subject_id=result.get("subjectID"),
                                subject_name=result.get("subjectName"),
                                old_title=result.get("old_title"),
                                new_title=result.get("new_title"),
                                old_description=result.get("old_description"),
                                new_description=result.get("new_description"),
                                old_characteristics=result.get("old_characteristics"),
                                new_characteristics=result.get("new_characteristics"),
                                validation_score=result.get("validation_score"),
                                title_score=result.get("title_score"),
                                description_score=result.get("description_score"),
                                iterations_done=result.get("iterations_done"),
                                processing_time=processing_time,
                                detected_colors=result.get("detected_colors"),
                                fixed_data=result.get("fixed_row"),
                                photo_urls=result.get("photo_urls"),
                                status=status,
                                error_message=error_message,
                            )
                        else:
                            # pipeline yiqilib ketgan bo'lsa ham minimal zapis
                            repo.create_history(
                                user_id=user_id,
                                article=article,
                                nm_id=None,
                                subject_id=None,
                                subject_name=None,
                                status=status,
                                error_message=error_message,
                                processing_time=processing_time,
                            )
                except Exception as history_err:
                    # history yozishda xato bo'lsa – faqat log jo'natamiz
                    await queue.put(
                        json.dumps(
                            {
                                "type": "log",
                                "message": f"⚠️ Ошибка записи истории: {history_err}",
                            },
                            ensure_ascii=False,
                        )
                    )

                # Stream yakuni
                await queue.put("[DONE]")

        # Pipeline taskini fon’da ishga tushiramiz
        asyncio.create_task(run_pipeline())

        # Navbat bilan queue'dan olib SSE blok qilib yuboramiz
        while True:
            data = await queue.get()

            if data == "[DONE]":
                yield "data: [DONE]\n\n"
                break

            yield f"data: {data}\n\n"

    async def fetch_current_card(self, article: str) -> dict | None:
        try:
            return await asyncio.to_thread(
                self.pipeline_service.get_current_card,
                article=article,
            )
        except ValueError:
            # Pipeline kartani topa olmasa, None qaytaramiz
            return None
