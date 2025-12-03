import asyncio
from typing import List, Dict, Any, Callable, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import time

from services.pipeline_service import PipelineService
from repositories.history_repository import HistoryRepository
from core.database import get_db


class BatchProcessor:
    
    def __init__(self, max_workers: int = 3):
        self.max_workers = max_workers
        self.pipeline = PipelineService()
    
    async def process_batch(
        self,
        articles: List[str],
        user_id: int,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:

        start_time = time.time()
        total_cards = len(articles)
        
        results = {
            "total": total_cards,
            "completed": 0,
            "failed": 0,
            "processing": 0,
            "cards": [],
            "errors": []
        }
        
        if progress_callback:
            progress_callback({
                "type": "batch_started",
                "total": total_cards,
                "timestamp": datetime.utcnow().isoformat()
            })
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_article = {
                executor.submit(
                    self._process_single_card,
                    article,
                    user_id,
                    progress_callback
                ): article
                for article in articles
            }
            
            for future in as_completed(future_to_article):
                article = future_to_article[future]
                
                try:
                    result = future.result()
                    results["completed"] += 1
                    results["cards"].append(result)
                    
                    if progress_callback:
                        progress_callback({
                            "type": "card_completed",
                            "article": article,
                            "progress": results["completed"] / total_cards * 100,
                            "timestamp": datetime.utcnow().isoformat()
                        })
                
                except Exception as e:
                    results["failed"] += 1
                    error_info = {
                        "article": article,
                        "error": str(e),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    results["errors"].append(error_info)
                    
                    if progress_callback:
                        progress_callback({
                            "type": "card_failed",
                            "article": article,
                            "error": str(e),
                            "timestamp": datetime.utcnow().isoformat()
                        })

        processing_time = time.time() - start_time
        results["processing_time"] = processing_time
        results["avg_time_per_card"] = processing_time / total_cards if total_cards > 0 else 0
        
        if progress_callback:
            progress_callback({
                "type": "batch_completed",
                "results": results,
                "timestamp": datetime.utcnow().isoformat()
            })
        
        return results
    
    def _process_single_card(
        self,
        article: str,
        user_id: int,
        progress_callback: Optional[Callable]
    ) -> Dict[str, Any]:
        start_time = time.time()
        
        try:
            if progress_callback:
                progress_callback({
                    "type": "card_processing",
                    "article": article,
                    "timestamp": datetime.utcnow().isoformat()
                })

            result = self.pipeline.process_article(
                article=article,
                log_callback=lambda msg: self._handle_log(msg, article, progress_callback)
            )
            
            processing_time = time.time() - start_time
            result["processing_time"] = processing_time

            self._save_to_history(result, user_id, processing_time)
            
            return result
        
        except Exception as e:
            processing_time = time.time() - start_time
            
            self._save_failed_to_history(article, user_id, str(e), processing_time)
            
            raise
    
    def _handle_log(
        self,
        message: str,
        article: str,
        progress_callback: Optional[Callable]
    ):
        if progress_callback:
            progress_callback({
                "type": "card_log",
                "article": article,
                "message": message,
                "timestamp": datetime.utcnow().isoformat()
            })
    
    def _save_to_history(
        self,
        result: Dict[str, Any],
        user_id: int,
        processing_time: float
    ):
        with get_db() as db:
            history_repo = HistoryRepository(db)
            history_repo.create_history(
                user_id=user_id,
                nm_id=result.get("nmID"),
                article=result.get("article"),
                subject_id=result.get("subjectID"),
                subject_name=result.get("subject_name"),
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
                best_iteration=result.get("best_iteration"),
                processing_time=processing_time,
                detected_colors=result.get("detected_colors"),
                fixed_data=result.get("fixed_row"),
                photo_urls=result.get("photo_urls"),
                status="completed"
            )
    
    def _save_failed_to_history(
        self,
        article: str,
        user_id: int,
        error: str,
        processing_time: float
    ):
        with get_db() as db:
            history_repo = HistoryRepository(db)
            history_repo.create_history(
                user_id=user_id,
                article=article,
                status="failed",
                error_message=error,
                processing_time=processing_time
            )
