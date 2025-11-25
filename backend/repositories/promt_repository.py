from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import datetime

from models.promt import PromptTemplate, PromptVersion


class PromptRepository:
    """Repository for managing prompt templates"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_active_prompt(self, prompt_type: str) -> Optional[PromptTemplate]:
        """Get active prompt by type"""
        return self.db.query(PromptTemplate).filter(
            PromptTemplate.prompt_type == prompt_type,
            PromptTemplate.is_active == True
        ).first()
    
    def get_all_prompts(self) -> List[PromptTemplate]:
        """Get all prompt templates"""
        return self.db.query(PromptTemplate).all()
    
    def create_prompt(
        self,
        prompt_type: str,
        system_prompt: str,
        strict_rules: Optional[str] = None,
        examples: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> PromptTemplate:
        """Create new prompt template"""
        prompt = PromptTemplate(
            prompt_type=prompt_type,
            system_prompt=system_prompt,
            strict_rules=strict_rules,
            examples=examples,
            created_by=created_by,
            version=1
        )
        self.db.add(prompt)
        self.db.flush()  # Flush to get the ID without committing
        
        # Save version history
        self._save_version(prompt, created_by, "Initial creation")
        
        self.db.commit()  # Commit after version is saved
        self.db.refresh(prompt)
        
        return prompt
    
    def update_prompt(
        self,
        prompt_type: str,
        system_prompt: Optional[str] = None,
        strict_rules: Optional[str] = None,
        examples: Optional[str] = None,
        updated_by: Optional[str] = None,
        change_reason: Optional[str] = None
    ) -> PromptTemplate:
        """Update existing prompt template"""
        prompt = self.get_active_prompt(prompt_type)
        if not prompt:
            raise ValueError(f"Prompt type '{prompt_type}' not found")
        
        # Update fields
        if system_prompt is not None:
            prompt.system_prompt = system_prompt
        if strict_rules is not None:
            prompt.strict_rules = strict_rules
        if examples is not None:
            prompt.examples = examples
        
        prompt.version += 1
        prompt.updated_at = datetime.utcnow()
        
        self.db.flush()  # Flush to update without committing
        
        # Save version history
        self._save_version(prompt, updated_by, change_reason)
        
        self.db.commit()  # Commit after version is saved
        self.db.refresh(prompt)
        
        return prompt
    
    def get_prompt_versions(self, prompt_type: str) -> List[PromptVersion]:
        """Get version history for prompt"""
        prompt = self.get_active_prompt(prompt_type)
        if not prompt:
            return []
        
        return self.db.query(PromptVersion).filter(
            PromptVersion.prompt_template_id == prompt.id
        ).order_by(PromptVersion.version.desc()).all()
    
    def _save_version(
        self,
        prompt: PromptTemplate,
        created_by: Optional[str],
        change_reason: Optional[str]
    ):
        """Save prompt version to history"""
        version = PromptVersion(
            prompt_template_id=prompt.id,
            system_prompt=prompt.system_prompt,
            strict_rules=prompt.strict_rules,
            examples=prompt.examples,
            version=prompt.version,
            created_by=created_by,
            change_reason=change_reason
        )
        self.db.add(version)
        # Don't commit here - let the caller handle transaction