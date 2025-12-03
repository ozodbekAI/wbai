# models/promt.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from core.database import Base


class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id = Column(Integer, primary_key=True, index=True)

    prompt_type = Column(String(50), unique=True, nullable=False, index=True)

    system_prompt = Column(Text, nullable=False)
    strict_rules = Column(Text, nullable=True)
    examples = Column(Text, nullable=True)

    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Relationships
    creator = relationship("User", back_populates="created_prompts")
    versions = relationship(
        "PromptVersion",
        back_populates="template",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "prompt_type": self.prompt_type,
            "system_prompt": self.system_prompt,
            "strict_rules": self.strict_rules,
            "examples": self.examples,
            "version": self.version,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by_id": self.created_by_id,
        }


class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = Column(Integer, primary_key=True, index=True)
    prompt_template_id = Column(Integer, ForeignKey("prompt_templates.id"), nullable=False, index=True)

    system_prompt = Column(Text, nullable=False)
    strict_rules = Column(Text, nullable=True)
    examples = Column(Text, nullable=True)
    version = Column(Integer, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(100), nullable=True)
    change_reason = Column(Text, nullable=True)

    template = relationship("PromptTemplate", back_populates="versions")
