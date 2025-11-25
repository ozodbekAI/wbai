import json
import asyncio
from typing import AsyncGenerator

from services.pipeline_service import PipelineService


class ProcessController:
    
    def __init__(self):
        self.pipeline_service = PipelineService()
    
    async def process_stream(self, article: str) -> AsyncGenerator[str, None]:
        logs = []
        
        def log_callback(msg: str):
            logs.append(msg)
        
        try:
            result = await asyncio.to_thread(
                self.pipeline_service.process_article,
                article=article,
                log_callback=log_callback
            )
            
            # ✅ LOG: Natijani JSON formatda chiqarish
            print("=" * 80)
            print("📤 BACKEND NATIJA (JSON):")
            print(json.dumps(result, ensure_ascii=False, indent=2))
            print("=" * 80)
            
            for log in logs:
                yield f"data: {json.dumps({'type': 'log', 'message': log})}\n\n"
                await asyncio.sleep(0.01)
            
            yield f"data: {json.dumps({'type': 'result', 'data': result}, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"