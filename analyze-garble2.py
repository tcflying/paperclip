# 分析方法2得到的 Latin-1 重建结果
latin1_rebuilt = "È«ï¿½Ô¶ï¿½ï¿½ï¿½ï¿½ï¿½Ë¯ï¿½ï¿½ï¿½ï¿½ÓªÏµÍ³Òªï¿½ï¿½"

print("=== 逐字符分析 Latin-1 重建 ===")
for i, c in enumerate(latin1_rebuilt):
    print(f"  [{i}] {c!r} U+{ord(c):04X} = 0x{ord(c):02X}")

print("\n=== 尝试多种解码 ===")

# 假设原始是法语
try:
    bytes_latin = latin1_rebuilt.encode('latin-1')
    print("\n作为法语 (ISO-8859-1 -> UTF-8):")
    print(bytes_latin.decode('iso-8859-1'))
except Exception as e:
    print(f"法语解码失败: {e}")

# 假设原始是德语 (cp1252)
try:
    bytes_latin = latin1_rebuilt.encode('latin-1')
    print("\n作为德语 (Windows-1252 -> UTF-8):")
    print(bytes_latin.decode('cp1252'))
except Exception as e:
    print(f"德语解码失败: {e}")

# 假设原始是俄语 (cp1251)
try:
    bytes_latin = latin1_rebuilt.encode('latin-1')
    print("\n作为俄语 (Windows-1251 -> UTF-8):")
    print(bytes_latin.decode('cp1251'))
except Exception as e:
    print(f"俄语解码失败: {e}")

# 假设原始是中文 (GBK -> UTF-8)
try:
    bytes_latin = latin1_rebuilt.encode('latin-1')
    print("\n作为中文 (GBK -> UTF-8):")
    print(bytes_latin.decode('gbk'))
except Exception as e:
    print(f"中文解码失败: {e}")

# 尝试 Windows-1252
try:
    bytes_latin = latin1_rebuilt.encode('latin-1')
    print("\n作为 Windows-1252:")
    for b in bytes_latin[:50]:
        print(f"  0x{b:02X} -> {chr(b)} (cp1252: {chr(b) if 32 <= b < 127 else '?'})")
except Exception as e:
    print(f"失败: {e}")
