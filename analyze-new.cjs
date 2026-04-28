// 分析新公司 CMPAA 的乱码
h2_garbled = "��ϯ������"
span_garbled = "����������ͼܹ���ƣ����������Ŷӣ�������ά��AI��������ϵͳ����CEOЭ���ƶ�����·��ͼ���߱�AI/����ѧϰ�������������׻���ڿƼ��������ȡ�"

print("=== h2 乱码分析 ===")
for c in h2_garbled:
    print(f"  {c!r} U+{ord(c):04X}")

print("\n=== span 乱码分析 ===")
for c in span_garbled[:50]:
    print(f"  {c!r} U+{ord(c):04X}")

print("\n=== 尝试解码 ===")

# 尝试 GBK
try:
    bytes_h2 = h2_garbled.encode('latin-1')
    print("\nh2 as GBK:", bytes_h2.decode('gbk'))
except Exception as e:
    print(f"GBK failed: {e}")

try:
    bytes_span = span_garbled.encode('latin-1')
    print("span as GBK:", bytes_span.decode('gbk')[:100])
except Exception as e:
    print(f"GBK failed: {e}")

# 尝试 Latin-1 -> UTF-8
try:
    bytes_h2 = h2_garbled.encode('latin-1')
    print("\nh2 as UTF-8 from Latin-1:", bytes_h2.decode('utf-8'))
except Exception as e:
    print(f"UTF-8 failed: {e}")
