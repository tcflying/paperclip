# 分析乱码字符串的原始内容
garbled = "ȫ�Զ�����˯����ӪϵͳҪ��"

# 方法1: 假设是 UTF-8 被当作 Latin-1 解读
try:
    bytes_from_garbled = garbled.encode('latin-1')
    print("=== 方法1: 假设原始是 UTF-8，乱码时被当作 Latin-1 ===")
    print("原始字节 (hex):", bytes_from_garbled.hex())
    try:
        reconstructed = bytes_from_garbled.decode('utf-8')
        print("重建为 UTF-8:", reconstructed)
    except:
        print("无法用 UTF-8 解码")
except:
    print("无法用 Latin-1 编码")

# 方法2: 假设是 Latin-1 被当作 UTF-8 解读
print("\n=== 方法2: 假设原始是 Latin-1，被错误当作 UTF-8 ===")
try:
    bytes_from_latin1 = garbled.encode('utf-8')
    print("原始字节 (hex):", bytes_from_latin1.hex())
    try:
        reconstructed = bytes_from_latin1.decode('latin-1')
        print("重建为 Latin-1:", reconstructed)
    except:
        print("无法用 Latin-1 解码")
except Exception as e:
    print("编码失败:", e)

# 方法3: 逐字符分析 Unicode 范围
print("\n=== 逐字符分析 ===")
for i, c in enumerate(garbled):
    print(f"  [{i}] {c!r} U+{ord(c):04X}")
