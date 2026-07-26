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
