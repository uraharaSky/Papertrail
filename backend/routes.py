from fastapi import APIRouter
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np

router = APIRouter()

model = SentenceTransformer("all-MiniLM-L6-v2")

articles = []

class TextInput(BaseModel):
    text: str
    title: str = ""
    url: str = ""

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

@router.post("/save")
def save_article(data: TextInput):
    embedding = model.encode(data.text).tolist()

    article = {
        "title": data.title,
        "url": data.url,
        "text": data.text,
        "embedding": embedding
    }

    articles.append(article)

    return {"status": "saved", "total": len(articles)}

@router.post("/search")
def search(data: TextInput):
    if not articles:
        return {"match": None, "message": "No articles saved yet"}

    query_embedding = model.encode(data.text)

    best_score = -1
    best_article = None

    for article in articles:
        score = cosine_similarity(query_embedding, np.array(article["embedding"]))

        if score > best_score:
            best_score = score
            best_article = article

    return {
        "match": best_article,
        "score": float(best_score)
    }