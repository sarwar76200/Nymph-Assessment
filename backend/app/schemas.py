from enum import Enum
from pydantic import BaseModel, EmailStr, Field


class PlaceholderResponse(BaseModel):
    message: str = "Lorem ipsum dolor sit amet."


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class ConversationStatus(str, Enum):
    active = "active"
    completed = "completed"


class ConversationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class ConversationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    status: ConversationStatus | None = None


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"


class MessageCreate(BaseModel):
    role: MessageRole
    content: str = Field(min_length=1)


class DocumentMetadataCreate(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    file_type: str = Field(pattern=r"^(pdf|docx|txt)$")
    file_size: int = Field(gt=0)
