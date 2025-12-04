# import json
# from typing import Dict
# from core.config import settings

# def load_limits() -> Dict[str, Dict[str, int]]:
#         limits_path = settings.DATA_DIR / "Справочник лимитов.json"
#         with limits_path.open("r", encoding="utf-8") as f:
#             return json.load(f)
        
# print(load_limits().get("Цвет", {}).get("max", 5))


from services.pipeline_service import PipelineService


pipeline_service = PipelineService()

result = pipeline_service.process_article(23723077)

print(result)



#
# from services.data_loader import DataLoader

# dataloader = DataLoader()


# # print(dataloader.load_parent_names())
# print(dataloader.load_by_parent("зеленый"))



