from fastapi import APIRouter
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import numpy as np

router = APIRouter()

# Load the embedding model once at import time so requests can reuse it.
model = SentenceTransformer("all-MiniLM-L6-v2")

# Temporary in-memory storage for saved articles and their embeddings.
articles = []

class TextInput(BaseModel):
    text: str
    title: str = ""
    url: str = ""

def cosine_similarity(a, b):
    # Compare two embedding vectors by directional similarity.
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

@router.post("/save")
def save_article(data: TextInput):
    # Convert the submitted text into an embedding that can be searched later.
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
    # Return early when there is nothing available to compare against.
    if not articles:
        return {"match": None, "message": "No articles saved yet"}

    # Build an embedding for the incoming query text.
    query_embedding = model.encode(data.text)

    results = []

    for article in articles:

        score = cosine_similarity(
            query_embedding,
            np.array(article["embedding"])
        )

        results.append({
            "title": article["title"],
            "url": article["url"],
            "text": article["text"][:300],
            "score": float(score)
        })

    #Filtering the results
    filtered_results = [
        r for r in results
        if r["score"] > 0.45
    ]
    # Sort highest similarity first
    filtered_results.sort(
        key = lambda x: x["score"],
        reverse = True
    )
    # Keep top 4
    top_results = filtered_results[:4]

    return {
        "matches": top_results
    }
