# repositories/user_repository.py
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime

from models.user import User, UserRole
from core.security import get_password_hash


class UserRepository:
    

    def __init__(self, db: Session):
        self.db = db

    def create_user(
        self,
        username: str,
        email: str,
        password: str,
        full_name: Optional[str] = None,
        role: UserRole = UserRole.USER,
    ) -> User:
        """Create new user"""
        existing = self.get_by_username_or_email(username, email)
        if existing:
            raise ValueError("Username or email already exists")

        user = User(
            username=username,
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=role,
        )

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return user

    def get_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()

    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()

    def get_by_username_or_email(
        self,
        username: str,
        email: str,
    ) -> Optional[User]:
        """Get user by username or email"""
        return (
            self.db.query(User)
            .filter(or_(User.username == username, User.email == email))
            .first()
        )

    def get_all_users(
        self,
        skip: int = 0,
        limit: int = 100,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
    ) -> List[User]:
        """Get all users with filters"""
        query = self.db.query(User)

        if role:
            query = query.filter(User.role == role)
        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        return query.offset(skip).limit(limit).all()

    def update_user(
        self,
        user_id: int,
        email: Optional[str] = None,
        full_name: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
    ) -> User:
        """Update user information"""
        user = self.get_by_id(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        if email is not None:
            existing = self.get_by_email(email)
            if existing and existing.id != user_id:
                raise ValueError("Email already in use")
            user.email = email

        if full_name is not None:
            user.full_name = full_name
        if role is not None:
            user.role = role
        if is_active is not None:
            user.is_active = is_active

        user.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(user)

        return user

    def update_password(self, user_id: int, new_password: str) -> User:
        
        user = self.get_by_id(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        user.hashed_password = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(user)

        return user

    def update_last_login(self, user_id: int):
        """Update user's last login timestamp"""
        user = self.get_by_id(user_id)
        if user:
            user.last_login = datetime.utcnow()
            self.db.commit()

    def delete_user(self, user_id: int):
        """Soft delete user (deactivate)"""
        user = self.get_by_id(user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        user.is_active = False
        user.updated_at = datetime.utcnow()

        self.db.commit()