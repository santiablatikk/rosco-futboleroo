import os
import requests
from PIL import Image
import io

# Configuration
API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    raise ValueError("Please set the OPENAI_API_KEY environment variable")

API_URL = "https://api.openai.com/v1/images/generations"

# Directory structure
BASE_DIR = "public/img/blog"
os.makedirs(BASE_DIR, exist_ok=True)

# Image specifications
IMAGE_SPECS = {
    # Principal images (already exist)
    "champions.jpg": "A professional photograph of the UEFA Champions League trophy, showing the iconic cup with large handles, well-lit and detailed",
    "worldcup.jpg": "A professional photograph of the FIFA World Cup trophy, showing the iconic design with two human figures holding up the Earth",
    "legends.jpg": "A professional collage of football legends including Pelé, Maradona, Cruyff, and other iconic players, well-composed and high quality",
    "messi-evolution.jpg": "A professional collage showing Lionel Messi's career evolution from young Barcelona player to World Cup winner with Argentina",
    "tacticas.jpg": "A professional tactical board showing football formations, with clear lines and player positions",
    "estadios.jpg": "A professional panoramic collage of famous football stadiums including Maracaná, Camp Nou, and Wembley",

    # Leyendas del Fútbol
    "pele.jpg": "A professional photograph of Pelé holding the World Cup trophy, historical moment",
    "zidane.jpg": "A professional action shot of Zinedine Zidane performing a characteristic technical move",
    "legends-collage.jpg": "A professional collage of football legends with different players than the main collage",

    # Mundial de Fútbol
    "maradona-1986.jpg": "A professional historical photograph of Diego Maradona lifting the World Cup trophy in 1986",
    "messi-worldcup.jpg": "A professional photograph of Lionel Messi lifting the World Cup trophy in Qatar 2022",
    "messi-world-cup.jpg": "An alternative professional photograph of Messi with the World Cup trophy",

    # Evolución de Messi
    "messi-young.jpg": "A professional photograph of young Lionel Messi during his time at La Masía",
    "messi.jpg": "A professional portrait of Lionel Messi",

    # Estadios
    "maracana.jpg": "A professional aerial view of Maracaná Stadium in Brazil",
    "camp-nou.jpg": "A professional interior view of Camp Nou stadium",
    "camp-nou-aerial.jpg": "A professional aerial view of Camp Nou stadium",
    "wembley.jpg": "A professional view of Wembley Stadium",
    "wembley-night.jpg": "A professional night view of Wembley Stadium during a match",
    "bernabeu.jpg": "A professional view of Santiago Bernabéu Stadium",

    # Champions League
    "champions-trophy.jpg": "A detailed professional photograph of the Champions League trophy",
    "champions-trophy-new.jpg": "A professional photograph of the current Champions League trophy design",
    "real-madrid-1950s.jpg": "A professional historical photograph of Real Madrid team from the 1950s",
    "di-stefano.jpg": "A professional photograph of Alfredo Di Stéfano in Real Madrid shirt",
    "ajax-1970s.jpg": "A professional historical photograph of Ajax Amsterdam team from the 1970s",
    "bayern-70s.jpg": "A professional historical photograph of Bayern Munich team from the 1970s",
    "manchester-united-1999.jpg": "A professional photograph of Manchester United team that won the treble in 1999",
    "barcelona-2009.jpg": "A professional photograph of Barcelona team under Guardiola in 2009",
    "real-madrid-la-decima.jpg": "A professional photograph of Real Madrid celebrating their tenth Champions League title",

    # Tácticas
    "tactical-2-3-5.jpg": "A professional tactical diagram showing the 2-3-5 (Pyramid) formation",
    "tactical-catenaccio.jpg": "A professional tactical diagram showing the Catenaccio system",
    "tactical-4-3-3.jpg": "A professional tactical diagram showing the 4-3-3 formation",
    "tactical-4-4-2.jpg": "A professional tactical diagram showing the traditional 4-4-2 formation",
    "tactical-modern.jpg": "A professional tactical diagram showing modern high-pressing tactics"
}

def generate_image(prompt, size="1024x1024"):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "prompt": prompt,
        "size": size,
        "n": 1
    }
    
    response = requests.post(API_URL, headers=headers, json=data)
    if response.status_code == 200:
        image_url = response.json()["data"][0]["url"]
        return requests.get(image_url).content
    else:
        print(f"Error generating image: {response.text}")
        return None

def save_image(image_data, filename):
    if image_data:
        image = Image.open(io.BytesIO(image_data))
        # Resize according to specifications
        if "tactical" in filename:
            if "4-3-3" in filename or "4-4-2" in filename:
                image = image.resize((400, 300))
            else:
                image = image.resize((600, 400))
        elif "legends-collage" in filename:
            image = image.resize((600, 300))
        elif "messi" in filename and "young" not in filename and "world" not in filename:
            image = image.resize((600, 400))
        else:
            image = image.resize((800, 500))
        
        image.save(os.path.join(BASE_DIR, filename), "JPEG", quality=95)
        print(f"Generated and saved: {filename}")
    else:
        print(f"Failed to generate: {filename}")

def main():
    for filename, prompt in IMAGE_SPECS.items():
        if not os.path.exists(os.path.join(BASE_DIR, filename)):
            print(f"Generating {filename}...")
            image_data = generate_image(prompt)
            save_image(image_data, filename)
        else:
            print(f"Image already exists: {filename}")

if __name__ == "__main__":
    main() 