import os
import requests

def execute(prompt, options=None):
    # Set default A4 mini-poster options (portrait 1:1.41)
    config = {
        "prompt": prompt,
        "aspect_ratio": "1:1.41",
        "quality": "high",
        "output_format": "png"
    }
    if options:
        config.update(options)
        
    print(f"Routing production pipeline to Nano Banana engine...")
    
    try:
        # Calls the underlying Nano Banana generation service
        # In Antigravity, the auth token is automatically injected into the environment
        headers = {"Authorization": f"Bearer {os.getenv('GOOGLE_OAUTH_TOKEN')}"}
        
        # Internal endpoint exposed to the agent framework
        response = requests.post("http://localhost:8080/v1/nano-banana/generate", json=config, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            return {"status": "success", "image_url": data.get("url"), "path": data.get("file_path")}
        else:
            return {"status": "error", "message": f"Engine rejected request: {response.text}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

