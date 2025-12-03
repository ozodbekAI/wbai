from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import List
from pydantic import BaseModel, Field

from services.batch_processor import BatchProcessor
from core.dependencies import get_current_user
import json
import asyncio


router = APIRouter()


class BatchProcessRequest(BaseModel):
    articles: List[str] = Field(..., min_items=1, max_items=50)




@router.post("/batch")
async def process_batch(
    request: BatchProcessRequest,
    current_user: dict = Depends(get_current_user)
):
    """Process multiple cards in parallel with real-time progress"""
    
    async def event_generator():
        processor = BatchProcessor(max_workers=3)
        
        async def progress_callback(event: dict):
            # Send event to client
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.01)
        
        try:
            results = await processor.process_batch(
                articles=request.articles,
                user_id=current_user["user_id"],
                progress_callback=progress_callback
            )
            
            # Send final results
            yield f"data: {json.dumps({'type': 'final_results', 'data': results}, ensure_ascii=False)}\n\n"
        
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )