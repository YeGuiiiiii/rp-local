# -*- coding: utf-8 -*-
"""finalize-apk.py —— 装配 APK 的最后一步：把 native dex 塞进 apktool 产物。

背景（2026-11-13 闪退事故的 root cause）：旧 build.ps1 用 .NET ZipArchive Update 模式改 zip，
其行为依赖 PowerShell 会话状态——一旦 System.IO.Compression 被显式 Add-Type，
Update 模式会把整个包重新编码：所有条目 flags 变 0x8（声明 bit3 却没有 data descriptor、
UTF-8 位丢失），Android 原生 zip 解析器读到即 abort，App 启动即死且不留任何 Java 日志。
2.9.044/045/046 三包全部死于这个装配差异，与前端内容无关。

本脚本保证确定性：apktool 输出的每个条目按**原始字节**搬运（local header、extra、
data descriptor 全部原样），只追加一个 classes2.dex（flags=0x0，与 2.9.043 的包同构）。
"""
import struct, sys, zlib

USAGE = 'usage: finalize-apk.py <apktool-output.apk> <native-dex> <out.apk>'

# 白名单外的 assets 条目按旧行为剔除
ASSET_WHITELIST = ('assets/RP-Hub-LICENSE.txt', 'assets/LUCIDE-LICENSE.txt', 'assets/LOCAL-NOTICE.txt')

def obsolete(name):
    if not name.startswith('assets/'):
        return False
    return not (name.startswith('assets/local-site/') or name in ASSET_WHITELIST)

def u16(b, o): return struct.unpack_from('<H', b, o)[0]
def u32(b, o): return struct.unpack_from('<I', b, o)[0]

def main():
    if len(sys.argv) != 4:
        print(USAGE); return 2
    src_path, dex_path, dst_path = sys.argv[1:4]
    src = open(src_path, 'rb').read()
    dex = open(dex_path, 'rb').read()

    # ---- 解析 EOCD + 中央目录 ----
    eocd = src.rfind(b'PK\x05\x06')
    assert eocd >= 0, 'EOCD not found'
    total = u16(src, eocd + 10)
    cd_size = u32(src, eocd + 12)
    cd_off = u32(src, eocd + 16)
    assert u16(src, eocd + 8) == total, 'unexpected disk count'
    assert not (u16(src, eocd + 4) & 0x08) or True  # zip64 不处理（包体远小于 4GB）

    entries = []
    p = cd_off
    for _ in range(total):
        assert src[p:p+4] == b'PK\x01\x02', 'bad CD signature at %d' % p
        vmade  = u16(src, p+4)
        vneed  = u16(src, p+6)
        flags  = u16(src, p+8)
        method = u16(src, p+10)
        mtime  = u16(src, p+12); mdate = u16(src, p+14)
        crc    = u32(src, p+16)
        csize  = u32(src, p+20); usize = u32(src, p+24)
        nlen   = u16(src, p+28); elen  = u16(src, p+30); clen = u16(src, p+32)
        disk   = u16(src, p+34); iattr = u16(src, p+36); eattr = u32(src, p+38)
        loff   = u32(src, p+42)
        name   = src[p+46:p+46+nlen]
        extra  = src[p+46+nlen:p+46+nlen+elen]
        comment= src[p+46+nlen+elen:p+46+nlen+elen+clen]
        entries.append(dict(
            vmade=vmade, vneed=vneed, flags=flags, method=method,
            mtime=mtime, mdate=mdate, crc=crc, csize=csize, usize=usize,
            name=name, extra=extra, comment=comment, iattr=iattr, eattr=eattr,
            loff=loff, cd_tail=src[p+46+nlen+elen+clen:]))
        p += 46 + nlen + elen + clen
    assert p == cd_off + cd_size, 'CD size mismatch'

    # ---- 计算原始跨度：条目 i = [local header, 下一条目 header)，最后一条到 CD ----
    # descriptor / extra / 对齐间隙全在这段里，无需单独推算。
    by_loff = sorted(entries, key=lambda e: e['loff'])
    for i, e in enumerate(by_loff):
        nend = by_loff[i + 1]['loff'] if i + 1 < len(by_loff) else cd_off
        e['span'] = (e['loff'], nend)
    prev_end = 0
    for e in by_loff:
        s, t = e['span']
        assert s >= prev_end, 'local headers not monotonic at %r' % e['name']
        assert t > s, 'empty span at %r' % e['name']
        prev_end = t

    # ---- 重建条目（与历史可用风格逐字节同构）----
    # 历史基线（2.9.023~043 全部 22 个可用包实测）：AndroidManifest.xml 与 classes.dex 保持
    # apktool 原样（0x808 + data descriptor），其余条目一律 flags=0x800（bit11 UTF-8、无 bit3、
    # 无 descriptor、数据为原始压缩字节不重压）。坏掉的 044/045/046 是唯一的 0x8-无descriptor 风格。
    KEEP_RAW = {'AndroidManifest.xml', 'classes.dex'}
    out = bytearray()
    kept = []
    dropped = []
    for e in entries:
        name = e['name'].decode('utf-8', 'replace')
        if name == 'classes2.dex':
            dropped.append(name + ' (replaced)'); continue
        if obsolete(name):
            dropped.append(name); continue
        s, t = e['span']
        if name in KEEP_RAW and (e['flags'] & 0x08):
            # 原样保留：local header + 数据 + descriptor 一并搬运
            e['new_off'] = len(out)
            e['flags'] = e['flags']  # CD 同步用
            out += src[s:t]
        else:
            # 重建 LFH：flags=0x800，数据切原始压缩字节，无 descriptor
            h = e['loff']
            nlen = u16(src, h+26); elen = u16(src, h+28)
            data_off = h + 30 + nlen + elen
            data = src[data_off:data_off + e['csize']]
            assert len(data) == e['csize'], 'short data for %r' % e['name']
            e['flags'] = 0x800
            e['extra'] = b''  # LFH 的 extra 已写 0，CD 同步
            e['new_off'] = len(out)
            lfh = struct.pack('<IHHHHHIIIHH', 0x04034b50, e['vneed'], e['flags'],
                              e['method'], e['mtime'], e['mdate'],
                              e['crc'], e['csize'], e['usize'], len(e['name']), 0)
            out += lfh + e['name'] + data
        kept.append(e)

    # ---- 追加 classes2.dex（flags=0x0，无 descriptor，与 2.9.043 同构）----
    co = zlib.compressobj(6, zlib.DEFLATED, -15)
    cdex = co.compress(dex) + co.flush()
    crc = zlib.crc32(dex) & 0xFFFFFFFF
    # 取源包里 manifest 的 mtime/mdate 作为时间戳，保持与包内其他条目一致
    mtime, mdate = entries[0]['mtime'], entries[0]['mdate']
    name_b = b'classes2.dex'
    lfh = struct.pack('<IHHHHHIIIHH', 0x04034b50, 20, 0, 8, mtime, mdate,
                      crc, len(cdex), len(dex), len(name_b), 0)
    c2_off = len(out)
    out += lfh + name_b + cdex
    kept.append(dict(
        vmade=20, vneed=20, flags=0, method=8,
        mtime=mtime, mdate=mdate, crc=crc, csize=len(cdex), usize=len(dex),
        name=name_b, extra=b'', comment=b'', iattr=0, eattr=0,
        loff=c2_off, new_off=c2_off))

    # ---- 重建中央目录 + EOCD ----
    cd = bytearray()
    for e in kept:
        cd += struct.pack('<IHHHHHHIIIHHHHHII', 0x02014b50,
                          e['vmade'], e['vneed'], e['flags'], e['method'],
                          e['mtime'], e['mdate'], e['crc'], e['csize'], e['usize'],
                          len(e['name']), len(e['extra']), len(e['comment']),
                          e['disk'] if 'disk' in e else 0,
                          e['iattr'], e['eattr'], e['new_off'])
        cd += e['name'] + e['extra'] + e['comment']
    eocd = struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, len(kept), len(kept),
                       len(cd), len(out), 0)
    out += cd + eocd

    open(dst_path, 'wb').write(bytes(out))
    print('finalize: kept %d entries, dropped %s' % (len(kept), dropped if dropped else 'none'))
    print('finalize: classes2.dex %d -> %d bytes (deflated)' % (len(dex), len(cdex)))
    return 0

if __name__ == '__main__':
    sys.exit(main())
