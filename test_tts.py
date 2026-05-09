import asyncio
import edge_tts

async def t():
    communicate = edge_tts.Communicate('测试一下', 'zh-CN-YunxiNeural')
    async for chunk in communicate.stream():
        if chunk["type"] != "audio":
            print(chunk)

asyncio.run(t())
