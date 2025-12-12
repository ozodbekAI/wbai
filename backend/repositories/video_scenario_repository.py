# backend/repositories/video_scenario_repository.py

from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from models import VideoScenario


class VideoScenarioRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_all(self, only_active: bool = False) -> List[VideoScenario]:
        stmt = select(VideoScenario).order_by(
            VideoScenario.order_index, VideoScenario.id
        )
        if only_active:
            stmt = stmt.where(VideoScenario.is_active == True)
        result = self.session.execute(stmt)
        return list(result.scalars().all())

    def get_by_id(self, scenario_id: int) -> Optional[VideoScenario]:
        result = self.session.execute(
            select(VideoScenario).where(VideoScenario.id == scenario_id)
        )
        return result.scalar_one_or_none()

    def add(
        self,
        name: str,
        prompt: str,
        order_index: int = 0,
        is_active: bool = True,
    ) -> VideoScenario:
        scenario = VideoScenario(
            name=name,
            prompt=prompt,
            order_index=order_index,
            is_active=is_active,
        )
        self.session.add(scenario)
        self.session.commit()
        self.session.refresh(scenario)
        return scenario

    def update(
        self,
        scenario_id: int,
        name: Optional[str] = None,
        prompt: Optional[str] = None,
        order_index: Optional[int] = None,
        is_active: Optional[bool] = None,
    ) -> Optional[VideoScenario]:
        scenario = self.get_by_id(scenario_id)
        if not scenario:
            return None

        if name is not None:
            scenario.name = name
        if prompt is not None:
            scenario.prompt = prompt
        if order_index is not None:
            scenario.order_index = order_index
        if is_active is not None:
            scenario.is_active = is_active

        self.session.commit()
        self.session.refresh(scenario)
        return scenario

    def delete(self, scenario_id: int) -> None:
        self.session.execute(
            delete(VideoScenario).where(VideoScenario.id == scenario_id)
        )
        self.session.commit()
