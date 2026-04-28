#!/usr/bin/env python3

# 分析 CMPAA-2 title 的原始字节
# Title bytes (hex): efbfbdd6bde2bcbcefbfbdefbfbdc2b7efbfbdefbfbdcdbcceaaefbfbdefbfbdefbfbdefbfbdefbfbdefbfbdefbfbdefbfb

title_bytes = bytes.fromhex('efbfbdd6bde2bcbcefbfbdefbfbdc2b7efbfbdefbfbdcdbcceaaefbfbdefbfbdefbfbdefbfbdefbfbdefbfbdefbfbdefbfb')

print("=== 字节分析 ===")
print(f"Total bytes: {len(title_bytes)}")
print(f"Hex: {title_bytes.hex()}")

print("\n=== 作为 UTF-8 解码 ===")
try:
    print(title_bytes.decode('utf-8'))
except Exception as e:
    print(f"Failed: {e}")

print("\n=== 作为 GBK 解码 ===")
try:
    # 把 UTF-8 字节直接当作二进制序列
    print(title_bytes.decode('gbk', errors='replace'))
except Exception as e:
    print(f"Failed: {e}")

print("\n=== 分段分析 ===")
# efbfbd = U+FFFD (replacement char in UTF-8)
# 尝试找到有效的 UTF-8 多字节序列
i = 0
while i < len(title_bytes):
    b = title_bytes[i]
    if b < 0x80:
        print(f"[{i}] ASCII: {chr(b)}")
        i += 1
    elif b >= 0xc0:
        # 可能是 UTF-8 多字节序列的开始
        if b >= 0xe0:
            # 3-byte sequence
            if i + 2 < len(title_bytes):
                seq = title_bytes[i:i+3]
                try:
                    char = seq.decode('utf-8')
                    print(f"[{i}] UTF-8 3-byte: {char} ({seq.hex()})")
                except:
                    print(f"[{i}] Invalid UTF-8: {seq.hex()}")
                i += 3
            else:
                print(f"[{i}] Truncated: {title_bytes[i:].hex()}")
                break
        else:
            # 2-byte sequence
            if i + 1 < len(title_bytes):
                seq = title_bytes[i:i+2]
                try:
                    char = seq.decode('utf-8')
                    print(f"[{i}] UTF-8 2-byte: {char} ({seq.hex()})")
                except:
                    print(f"[{i}] Invalid UTF-8: {seq.hex()}")
                i += 2
            else:
                print(f"[{i}] Truncated")
                break
    else:
        # 可能是 Latin-1 单字节
        try:
            char = bytes([b]).decode('latin-1')
            print(f"[{i}] Latin-1: {char} ({b:02x})")
        except:
            print(f"[{i}] Byte: {b:02x}")
        i += 1

print("\n=== 尝试：原始是 GBK 中文，被当作 Latin-1 解读后再转 UTF-8 ===")
# 假设原始是 GBK: d6bd e2bc bc cd bc ce aa
# GBK "全自动化系统" 的 UTF-8 字节是: e585a8 e887aa e58d87 e7b3bb e7bb9f
# 如果用 Latin-1 解读 e5 85 a8 会得到: å¨å¨

# 尝试反推
gbk_candidates = ['全', '自', '动', '化', '系', '统', '聘', '任', '计', '划']
for c in gbk_candidates:
    utf8_bytes = c.encode('utf-8').hex()
    print(f"  {c} UTF-8: {utf8_bytes}")
