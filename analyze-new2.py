#!/usr/bin/env python3
h2_garbled = "��ϯ������"
span_garbled = "����������ͼܹ���ƣ����������Ŷӣ�������ά��AI��������ϵͳ����CEOЭ���ƶ�����·��ͼ���߱�AI/����ѧϰ�������������׻���ڿƼ��������ȡ�"

# 方法: 先把乱码当作 Latin-1 解码为字节，再尝试用 UTF-8 解码这些字节
def try_decode(garbled_text):
    try:
        # 把乱码字符用 Latin-1 解码成字节
        latin1_bytes = garbled_text.encode('latin-1')
        print(f"  As Latin-1 bytes (hex): {latin1_bytes[:30].hex()}")
        
        # 尝试用各种编码解读这些字节
        for enc in ['utf-8', 'gbk', 'cp1252', 'iso-8859-1']:
            try:
                decoded = latin1_bytes.decode(enc)
                print(f"  As {enc}: {decoded[:80]}")
            except:
                pass
    except Exception as e:
        print(f"  Failed: {e}")

print("=== h2 分析 ===")
try_decode(h2_garbled)

print("\n=== span 分析（前100字符）===")
try_decode(span_garbled[:100])

# 另一个尝试：把原始乱码直接当作某种编码解读
print("\n=== 直接解码尝试 ===")
for enc in ['gbk', 'cp1252', 'iso-8859-1']:
    try:
        decoded = h2_garbled.encode('utf-8').decode(enc)
        print(f"  h2 as UTF-8 -> {enc}: {decoded}")
    except Exception as e:
        print(f"  h2 UTF-8->{enc} failed: {e}")

# 关键发现：分析字节序列
print("\n=== 字节序列分析 ===")
# U+FFFD 是 UTF-8 解码失败时的替换字符
# 0xBF 0xBD 在 Windows-1252 中是 ¿ ½
# 这说明原始可能是 UTF-8 字节被当作 Latin-1 解读
