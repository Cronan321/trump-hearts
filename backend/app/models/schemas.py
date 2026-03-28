from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)


class LoginRequest(BaseModel):
    credential: str  # username or email
    password: str


class TokenResponse(BaseModel):
    user_id: str
    username: str
    token: str


class LoginResponse(BaseModel):
    user_id: str
    username: str
    token: str
    coin_balance: int


class UserProfileResponse(BaseModel):
    user_id: str
    username: str
    email: str
    coin_balance: int
    game_history_summary: dict
