#!/usr/bin/env python3
import psycopg2

conn = psycopg2.connect("postgres://paperclip:paperclip@127.0.0.1:54329/paperclip")
cur = conn.cursor()

cur.execute("SELECT title FROM issues WHERE identifier = 'CMPAA-2'")
row = cur.fetchone()

if row:
    title = row[0]
    print(f"Title: {title}")
    print(f"Type: {type(title)}")
    print(f"Length: {len(title)}")
    
    if isinstance(title, str):
        # 已经是 Python str (Unicode)
        print("\nUnicode characters:")
        for i, c in enumerate(title):
            print(f"  [{i}] {c} U+{ord(c):04X}")
        
        # 编码为不同格式
        utf8_bytes = title.encode('utf-8')
        print(f"\nUTF-8 bytes: {utf8_bytes.hex()}")
        
        # 尝试作为 GBK 解码
        try:
            gbk_bytes = title.encode('gbk')
            print(f"GBK bytes: {gbk_bytes.hex()}")
            # 再用 GBK 解码
            decoded = gbk_bytes.decode('gbk')
            print(f"GBK round-trip: {decoded}")
        except Exception as e:
            print(f"GBK failed: {e}")

conn.close()
