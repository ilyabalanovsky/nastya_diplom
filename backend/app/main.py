from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import students, courses, streams, import_excel, communication, documents

Base.metadata.create_all(bind=engine)

app = FastAPI(title="University Courses Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(students.router, prefix="/api/students", tags=["students"])
app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
app.include_router(streams.router, prefix="/api/streams", tags=["streams"])
app.include_router(import_excel.router, prefix="/api/import", tags=["import"])
app.include_router(communication.router, prefix="/api/communication", tags=["communication"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])


@app.get("/")
async def root():
    return {"message": "University Courses Management API"}
