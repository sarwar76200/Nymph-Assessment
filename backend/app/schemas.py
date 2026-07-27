from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class PlaceholderResponse(BaseModel):
    message: str = "Lorem ipsum dolor sit amet."


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class SignUpRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name must not be blank")
        return value


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    name: str

    model_config = ConfigDict(from_attributes=True)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ConversationStatus(str, Enum):
    active = "active"
    completed = "completed"


class ConversationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title must not be blank")
        return value


class ConversationResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    status: ConversationStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationTitleUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title must not be blank")
        return value


class ConversationStatusUpdate(BaseModel):
    status: ConversationStatus


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"


class MessageCreate(BaseModel):
    content: str = Field(min_length=1)

    @field_validator("content")
    @classmethod
    def content_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message content must not be blank")
        return value


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: MessageRole
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationSearchResult(ConversationResponse):
    matched_messages: list[MessageResponse]


class MessageCountResponse(BaseModel):
    total_messages: int


class DocumentMetadataCreate(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    file_type: str = Field(pattern=r"^(pdf|docx|txt)$")
    file_size: int = Field(gt=0)

    @field_validator("filename")
    @classmethod
    def filename_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Filename must not be blank")
        return value

    @field_validator("file_type", mode="before")
    @classmethod
    def normalize_file_type(cls, value: object) -> object:
        return value.lower() if isinstance(value, str) else value


class DocumentResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    filename: str
    file_type: str
    file_size: int
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)
