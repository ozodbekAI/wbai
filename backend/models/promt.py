from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class PromptTemplate(Base):
    """
    Модель для хранения шаблонов промптов.
    
    Статическая часть - остается в коде (JSON format, response structure)
    Динамическая часть - изменяется через админ-панель
    """
    __tablename__ = "prompt_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Тип промпта (generator, validator, refiner, etc.)
    prompt_type = Column(String(50), unique=True, nullable=False, index=True)
    
    # Основной текст промпта (редактируется через админ-панель)
    system_prompt = Column(Text, nullable=False)
    
    # Дополнительные строгие правила
    strict_rules = Column(Text, nullable=True)
    
    # Примеры для промпта
    examples = Column(Text, nullable=True)
    
    # Версионирование
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    
    # Метаданные
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100), nullable=True)
    
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
        }


class PromptVersion(Base):
    """История изменений промптов"""
    __tablename__ = "prompt_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    prompt_template_id = Column(Integer, nullable=False, index=True)
    
    system_prompt = Column(Text, nullable=False)
    strict_rules = Column(Text, nullable=True)
    examples = Column(Text, nullable=True)
    version = Column(Integer, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(100), nullable=True)
    change_reason = Column(Text, nullable=True)