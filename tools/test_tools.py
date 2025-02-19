import os
import sys

# Add the tools directory to the Python path
tools_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, tools_dir)

# Import our tools
from search_engine import search
from web_scraper import scrape
from llm_api import query_llm

def main():
    print("Testing search engine...")
    results = search("test query")
    print("Search results:", results)
    
    print("\nTesting web scraper...")
    content = scrape("https://example.com")
    print("Web content:", content)
    
    print("\nTesting LLM API...")
    response = query_llm("Hello, are you working?", provider="anthropic")
    print("LLM response:", response)

if __name__ == "__main__":
    main() 