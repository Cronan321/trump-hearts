from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.game import GameScore
from app.models.schemas import LoginRequest, LoginResponse, RegisterRequest, TokenResponse, UserProfileResponse
from app.models.user import User
from app.services.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(tags=["auth"])
bearer_scheme = HTTPBearer()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    # Check for existing username
    existing_username = await db.execute(select(User).where(User.username == body.username))
    if existing_username.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken",
        )

    # Check for existing email
    existing_email = await db.execute(select(User).where(User.email == body.email))
    if existing_email.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email address is already registered",
        )

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        coin_balance=25000,
    )
    db.add(user)

    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email is already in use",
        )

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(user_id=str(user.id), username=user.username, token=token)


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    result = await db.execute(
        select(User).where(or_(User.username == body.credential, User.email == body.credential))
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token({"sub": str(user.id)})
    return LoginResponse(
        user_id=str(user.id),
        username=user.username,
        token=token,
        coin_balance=user.coin_balance,
    )


@router.get("/me", response_model=UserProfileResponse)
async def me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    user = await get_current_user(credentials.credentials, db)

    games_played_result = await db.execute(
        select(func.count(GameScore.game_id)).where(GameScore.player_id == user.id)
    )
    games_played = games_played_result.scalar_one() or 0

    return UserProfileResponse(
        user_id=str(user.id),
        username=user.username,
        email=user.email,
        coin_balance=user.coin_balance,
        game_history_summary={"games_played": games_played, "total_wins": 0},
    )
