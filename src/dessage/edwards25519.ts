import {sha512} from "js-sha512";

function FeOne(fe: FieldElement): void {
    fe.setZero();
    fe.set(0, 1);
}

class FieldElement {
    values: Int32Array;

    constructor() {
        this.values = new Int32Array(10);
        this.values.fill(0);
    }

    set(index: number, value: number): void {
        this.values[index] = value;
    }

    get(index: number): number {
        return this.values[index];
    }
    setZero(): void {
        this.values.fill(0);
    }
}

const SqrtM1 = new FieldElement();
SqrtM1.set(0, -32595792);
SqrtM1.set(1, -7943725);
SqrtM1.set(2, 9377950);
SqrtM1.set(3, 3500415);
SqrtM1.set(4, 12389472);
SqrtM1.set(5, -272473);
SqrtM1.set(6, -25146209);
SqrtM1.set(7, -2005654);
SqrtM1.set(8, 326686);
SqrtM1.set(9, 11406482);
const zero = new FieldElement();
zero.setZero();
const d = new FieldElement();
d.set(0, -10913610);
d.set(1, 13857413);
d.set(2, -15372611);
d.set(3, 6949391);
d.set(4, 114729);
d.set(5, -8787816);
d.set(6, -6275908);
d.set(7, -3247719);
d.set(8, -18696448);
d.set(9, -12055116);

class ExtendedGroupElement {
    X: FieldElement;
    Y: FieldElement;
    Z: FieldElement;
    T: FieldElement;

    constructor() {
        this.X = new FieldElement();
        this.Y = new FieldElement();
        this.Z = new FieldElement();
        this.T = new FieldElement();
    }


    FromBytes(s: Uint8Array): boolean {
        const u = new FieldElement();
        const v = new FieldElement();
        const v3 = new FieldElement();
        const vxx = new FieldElement();
        const check = new FieldElement();

        FeFromBytes(this.Y, s);
        FeOne(this.Z);
        FeSquare(u, this.Y);
        FeMul(v, u, d);
        FeSub(u, u, this.Z); // y = y^2-1
        FeAdd(v, v, this.Z); // v = dy^2+1

        FeSquare(v3, v);
        FeMul(v3, v3, v); // v3 = v^3
        FeSquare(this.X, v3);
        FeMul(this.X, this.X, v);
        FeMul(this.X, this.X, u); // x = uv^7

        fePow22523(this.X, this.X); // x = (uv^7)^((q-5)/8)
        FeMul(this.X, this.X, v3);
        FeMul(this.X, this.X, u); // x = uv^3(uv^7)^((q-5)/8)

        const tmpX = new Uint8Array(32);
        const tmp2 = new Uint8Array(32);

        FeSquare(vxx, this.X);
        FeMul(vxx, vxx, v);
        FeSub(check, vxx, u); // vx^2-u
        if (FeIsNonZero(check) === 1) {
            FeAdd(check, vxx, u); // vx^2+u
            if (FeIsNonZero(check) === 1) {
                return false;
            }
            FeMul(this.X, this.X, SqrtM1);

            FeToBytes(tmpX, this.X);
            for (let i = 0; i < 32; i++) {
                tmp2[31 - i] = tmpX[i];
            }
        }

        if (FeIsNegative(this.X) !== (s[31] >> 7)) {
            FeNeg(this.X, this.X);
        }

        FeMul(this.T, this.X, this.Y);
        return true;
    }
}

function load4(input: Uint8Array): bigint {
    if (input.length < 4) {
        throw new Error("Input must have at least 4 bytes");
    }
    let r: bigint = 0n;
    r |= BigInt(input[0]);
    r |= BigInt(input[1]) << 8n;
    r |= BigInt(input[2]) << 16n;
    r |= BigInt(input[3]) << 24n;
    return r;
}

function load3(input: Uint8Array): bigint {
    if (input.length < 3) {
        throw new Error("Input must have at least 3 bytes");
    }
    let r: bigint = 0n;
    r |= BigInt(input[0]);
    r |= BigInt(input[1]) << 8n;
    r |= BigInt(input[2]) << 16n;
    return r;
}

function FeCombine(
    h: FieldElement,
    h0: bigint, h1: bigint, h2: bigint, h3: bigint, h4: bigint,
    h5: bigint, h6: bigint, h7: bigint, h8: bigint, h9: bigint
): void {
    let c0: bigint = 0n, c1: bigint = 0n, c2: bigint = 0n, c3: bigint = 0n, c4: bigint = 0n;
    let c5: bigint = 0n, c6: bigint = 0n, c7: bigint = 0n, c8: bigint = 0n, c9: bigint = 0n;

    c0 = (h0 + (1n << 25n)) >> 26n;
    h1 += c0;
    h0 -= c0 << 26n;
    c4 = (h4 + (1n << 25n)) >> 26n;
    h5 += c4;
    h4 -= c4 << 26n;

    c1 = (h1 + (1n << 24n)) >> 25n;
    h2 += c1;
    h1 -= c1 << 25n;
    c5 = (h5 + (1n << 24n)) >> 25n;
    h6 += c5;
    h5 -= c5 << 25n;

    c2 = (h2 + (1n << 25n)) >> 26n;
    h3 += c2;
    h2 -= c2 << 26n;
    c6 = (h6 + (1n << 25n)) >> 26n;
    h7 += c6;
    h6 -= c6 << 26n;

    c3 = (h3 + (1n << 24n)) >> 25n;
    h4 += c3;
    h3 -= c3 << 25n;
    c7 = (h7 + (1n << 24n)) >> 25n;
    h8 += c7;
    h7 -= c7 << 25n;

    c4 = (h4 + (1n << 25n)) >> 26n;
    h5 += c4;
    h4 -= c4 << 26n;
    c8 = (h8 + (1n << 25n)) >> 26n;
    h9 += c8;
    h8 -= c8 << 26n;

    c9 = (h9 + (1n << 24n)) >> 25n;
    h0 += c9 * 19n;
    h9 -= c9 << 25n;

    c0 = (h0 + (1n << 25n)) >> 26n;
    h1 += c0;
    h0 -= c0 << 26n;

    h.set(0, Number(h0));
    h.set(1, Number(h1));
    h.set(2, Number(h2));
    h.set(3, Number(h3));
    h.set(4, Number(h4));
    h.set(5, Number(h5));
    h.set(6, Number(h6));
    h.set(7, Number(h7));
    h.set(8, Number(h8));
    h.set(9, Number(h9));
}


function FeFromBytes(dst: FieldElement, src: Uint8Array): void {
    if (src.length !== 32) {
        throw new Error("Input must be exactly 32 bytes");
    }

    const h0 = load4(src.slice(0, 4));
    const h1 = load3(src.slice(4, 7)) << 6n;
    const h2 = load3(src.slice(7, 10)) << 5n;
    const h3 = load3(src.slice(10, 13)) << 3n;
    const h4 = load3(src.slice(13, 16)) << 2n;
    const h5 = load4(src.slice(16, 20));
    const h6 = load3(src.slice(20, 23)) << 7n;
    const h7 = load3(src.slice(23, 26)) << 5n;
    const h8 = load3(src.slice(26, 29)) << 4n;
    const h9 = (load3(src.slice(29, 32)) & 8388607n) << 2n;

    FeCombine(dst, h0, h1, h2, h3, h4, h5, h6, h7, h8, h9);
}
function feSquare(f: FieldElement): [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] {
    const f0 = BigInt(f.get(0));
    const f1 = BigInt(f.get(1));
    const f2 = BigInt(f.get(2));
    const f3 = BigInt(f.get(3));
    const f4 = BigInt(f.get(4));
    const f5 = BigInt(f.get(5));
    const f6 = BigInt(f.get(6));
    const f7 = BigInt(f.get(7));
    const f8 = BigInt(f.get(8));
    const f9 = BigInt(f.get(9));

    const f0_2 = 2n * f0;
    const f1_2 = 2n * f1;
    const f2_2 = 2n * f2;
    const f3_2 = 2n * f3;
    const f4_2 = 2n * f4;
    const f5_2 = 2n * f5;
    const f6_2 = 2n * f6;
    const f7_2 = 2n * f7;

    const f5_38 = 38n * f5;
    const f6_19 = 19n * f6;
    const f7_38 = 38n * f7;
    const f8_19 = 19n * f8;
    const f9_38 = 38n * f9;

    const h0 = f0 * f0 + f1_2 * f9_38 + f2_2 * f8_19 + f3_2 * f7_38 + f4_2 * f6_19 + f5 * f5_38;
    const h1 = f0_2 * f1 + f2 * f9_38 + f3_2 * f8_19 + f4 * f7_38 + f5_2 * f6_19;
    const h2 = f0_2 * f2 + f1_2 * f1 + f3_2 * f9_38 + f4_2 * f8_19 + f5_2 * f7_38 + f6 * f6_19;
    const h3 = f0_2 * f3 + f1_2 * f2 + f4 * f9_38 + f5_2 * f8_19 + f6 * f7_38;
    const h4 = f0_2 * f4 + f1_2 * f3_2 + f2 * f2 + f5_2 * f9_38 + f6_2 * f8_19 + f7 * f7_38;
    const h5 = f0_2 * f5 + f1_2 * f4 + f2_2 * f3 + f6 * f9_38 + f7_2 * f8_19;
    const h6 = f0_2 * f6 + f1_2 * f5_2 + f2_2 * f4 + f3_2 * f3 + f7_2 * f9_38 + f8 * f8_19;
    const h7 = f0_2 * f7 + f1_2 * f6 + f2_2 * f5 + f3_2 * f4 + f8 * f9_38;
    const h8 = f0_2 * f8 + f1_2 * f7_2 + f2_2 * f6 + f3_2 * f5_2 + f4 * f4 + f9 * f9_38;
    const h9 = f0_2 * f9 + f1_2 * f8 + f2_2 * f7 + f3_2 * f6 + f4_2 * f5;

    return [h0, h1, h2, h3, h4, h5, h6, h7, h8, h9];
}

function FeSquare(h: FieldElement, f: FieldElement): void {
    const [h0, h1, h2, h3, h4, h5, h6, h7, h8, h9] = feSquare(f);
    FeCombine(h, h0, h1, h2, h3, h4, h5, h6, h7, h8, h9);
}
function FeMul(h: FieldElement, f: FieldElement, g: FieldElement): void {
    const f0 = BigInt(f.get(0));
    const f1 = BigInt(f.get(1));
    const f2 = BigInt(f.get(2));
    const f3 = BigInt(f.get(3));
    const f4 = BigInt(f.get(4));
    const f5 = BigInt(f.get(5));
    const f6 = BigInt(f.get(6));
    const f7 = BigInt(f.get(7));
    const f8 = BigInt(f.get(8));
    const f9 = BigInt(f.get(9));

    const f1_2 = 2n * f1;
    const f3_2 = 2n * f3;
    const f5_2 = 2n * f5;
    const f7_2 = 2n * f7;
    const f9_2 = 2n * f9;

    const g0 = BigInt(g.get(0));
    const g1 = BigInt(g.get(1));
    const g2 = BigInt(g.get(2));
    const g3 = BigInt(g.get(3));
    const g4 = BigInt(g.get(4));
    const g5 = BigInt(g.get(5));
    const g6 = BigInt(g.get(6));
    const g7 = BigInt(g.get(7));
    const g8 = BigInt(g.get(8));
    const g9 = BigInt(g.get(9));

    const g1_19 = 19n * g1;
    const g2_19 = 19n * g2;
    const g3_19 = 19n * g3;
    const g4_19 = 19n * g4;
    const g5_19 = 19n * g5;
    const g6_19 = 19n * g6;
    const g7_19 = 19n * g7;
    const g8_19 = 19n * g8;
    const g9_19 = 19n * g9;

    const h0 = f0 * g0 + f1_2 * g9_19 + f2 * g8_19 + f3_2 * g7_19 + f4 * g6_19 + f5_2 * g5_19 + f6 * g4_19 + f7_2 * g3_19 + f8 * g2_19 + f9_2 * g1_19;
    const h1 = f0 * g1 + f1 * g0 + f2 * g9_19 + f3 * g8_19 + f4 * g7_19 + f5 * g6_19 + f6 * g5_19 + f7 * g4_19 + f8 * g3_19 + f9 * g2_19;
    const h2 = f0 * g2 + f1_2 * g1 + f2 * g0 + f3_2 * g9_19 + f4 * g8_19 + f5_2 * g7_19 + f6 * g6_19 + f7_2 * g5_19 + f8 * g4_19 + f9_2 * g3_19;
    const h3 = f0 * g3 + f1 * g2 + f2 * g1 + f3 * g0 + f4 * g9_19 + f5 * g8_19 + f6 * g7_19 + f7 * g6_19 + f8 * g5_19 + f9 * g4_19;
    const h4 = f0 * g4 + f1_2 * g3 + f2 * g2 + f3_2 * g1 + f4 * g0 + f5_2 * g9_19 + f6 * g8_19 + f7_2 * g7_19 + f8 * g6_19 + f9_2 * g5_19;
    const h5 = f0 * g5 + f1 * g4 + f2 * g3 + f3 * g2 + f4 * g1 + f5 * g0 + f6 * g9_19 + f7 * g8_19 + f8 * g7_19 + f9 * g6_19;
    const h6 = f0 * g6 + f1_2 * g5 + f2 * g4 + f3_2 * g3 + f4 * g2 + f5_2 * g1 + f6 * g0 + f7_2 * g9_19 + f8 * g8_19 + f9_2 * g7_19;
    const h7 = f0 * g7 + f1 * g6 + f2 * g5 + f3 * g4 + f4 * g3 + f5 * g2 + f6 * g1 + f7 * g0 + f8 * g9_19 + f9 * g8_19;
    const h8 = f0 * g8 + f1_2 * g7 + f2 * g6 + f3_2 * g5 + f4 * g4 + f5_2 * g3 + f6 * g2 + f7_2 * g1 + f8 * g0 + f9_2 * g9_19;
    const h9 = f0 * g9 + f1 * g8 + f2 * g7 + f3 * g6 + f4 * g5 + f5 * g4 + f6 * g3 + f7 * g2 + f8 * g1 + f9 * g0;

    FeCombine(h, h0, h1, h2, h3, h4, h5, h6, h7, h8, h9);
}

function FeSub(dst: FieldElement, a: FieldElement, b: FieldElement): void {
    dst.set(0, a.get(0) - b.get(0));
    dst.set(1, a.get(1) - b.get(1));
    dst.set(2, a.get(2) - b.get(2));
    dst.set(3, a.get(3) - b.get(3));
    dst.set(4, a.get(4) - b.get(4));
    dst.set(5, a.get(5) - b.get(5));
    dst.set(6, a.get(6) - b.get(6));
    dst.set(7, a.get(7) - b.get(7));
    dst.set(8, a.get(8) - b.get(8));
    dst.set(9, a.get(9) - b.get(9));
}

function FeAdd(dst: FieldElement, a: FieldElement, b: FieldElement): void {
    dst.set(0, a.get(0) + b.get(0));
    dst.set(1, a.get(1) + b.get(1));
    dst.set(2, a.get(2) + b.get(2));
    dst.set(3, a.get(3) + b.get(3));
    dst.set(4, a.get(4) + b.get(4));
    dst.set(5, a.get(5) + b.get(5));
    dst.set(6, a.get(6) + b.get(6));
    dst.set(7, a.get(7) + b.get(7));
    dst.set(8, a.get(8) + b.get(8));
    dst.set(9, a.get(9) + b.get(9));
}

function fePow22523(out: FieldElement, z: FieldElement): void {
    const t0 = new FieldElement();
    const t1 = new FieldElement();
    const t2 = new FieldElement();

    FeSquare(t0, z);
    // Skip loop since i < 1
    FeSquare(t1, t0);
    FeSquare(t1, t1); // Second iteration
    FeMul(t1, z, t1);
    FeMul(t0, t0, t1);
    FeSquare(t0, t0);
    // Skip loop since i < 1
    FeMul(t0, t1, t0);
    FeSquare(t1, t0);
    for (let i = 1; i < 5; i++) {
        FeSquare(t1, t1);
    }
    FeMul(t0, t1, t0);
    FeSquare(t1, t0);
    for (let i = 1; i < 10; i++) {
        FeSquare(t1, t1);
    }
    FeMul(t1, t1, t0);
    FeSquare(t2, t1);
    for (let i = 1; i < 20; i++) {
        FeSquare(t2, t2);
    }
    FeMul(t1, t2, t1);
    FeSquare(t1, t1);
    for (let i = 1; i < 10; i++) {
        FeSquare(t1, t1);
    }
    FeMul(t0, t1, t0);
    FeSquare(t1, t0);
    for (let i = 1; i < 50; i++) {
        FeSquare(t1, t1);
    }
    FeMul(t1, t1, t0);
    FeSquare(t2, t1);
    for (let i = 1; i < 100; i++) {
        FeSquare(t2, t2);
    }
    FeMul(t1, t2, t1);
    FeSquare(t1, t1);
    for (let i = 1; i < 50; i++) {
        FeSquare(t1, t1);
    }
    FeMul(t0, t1, t0);
    FeSquare(t0, t0);
    FeSquare(t0, t0); // Second iteration
    FeMul(out, t0, z);
}

function FeToBytes(s: Uint8Array, h: FieldElement): void {
    const carry = new Int32Array(10);

    let q = (19 * h.get(9) + (1 << 24)) >> 25;
    q = (h.get(0) + q) >> 26;
    q = (h.get(1) + q) >> 25;
    q = (h.get(2) + q) >> 26;
    q = (h.get(3) + q) >> 25;
    q = (h.get(4) + q) >> 26;
    q = (h.get(5) + q) >> 25;
    q = (h.get(6) + q) >> 26;
    q = (h.get(7) + q) >> 25;
    q = (h.get(8) + q) >> 26;
    q = (h.get(9) + q) >> 25;

    // Goal: Output h-(2^255-19)q, which is between 0 and 2^255-20.
    h.set(0, h.get(0) + 19 * q);

    // Goal: Output h-2^255 q, which is between 0 and 2^255-20.
    carry[0] = h.get(0) >> 26;
    h.set(1, h.get(1) + carry[0]);
    h.set(0, h.get(0) - (carry[0] << 26));
    carry[1] = h.get(1) >> 25;
    h.set(2, h.get(2) + carry[1]);
    h.set(1, h.get(1) - (carry[1] << 25));
    carry[2] = h.get(2) >> 26;
    h.set(3, h.get(3) + carry[2]);
    h.set(2, h.get(2) - (carry[2] << 26));
    carry[3] = h.get(3) >> 25;
    h.set(4, h.get(4) + carry[3]);
    h.set(3, h.get(3) - (carry[3] << 25));
    carry[4] = h.get(4) >> 26;
    h.set(5, h.get(5) + carry[4]);
    h.set(4, h.get(4) - (carry[4] << 26));
    carry[5] = h.get(5) >> 25;
    h.set(6, h.get(6) + carry[5]);
    h.set(5, h.get(5) - (carry[5] << 25));
    carry[6] = h.get(6) >> 26;
    h.set(7, h.get(7) + carry[6]);
    h.set(6, h.get(6) - (carry[6] << 26));
    carry[7] = h.get(7) >> 25;
    h.set(8, h.get(8) + carry[7]);
    h.set(7, h.get(7) - (carry[7] << 25));
    carry[8] = h.get(8) >> 26;
    h.set(9, h.get(9) + carry[8]);
    h.set(8, h.get(8) - (carry[8] << 26));
    carry[9] = h.get(9) >> 25;
    h.set(9, h.get(9) - (carry[9] << 25));

    s[0] = h.get(0) & 0xFF;
    s[1] = (h.get(0) >> 8) & 0xFF;
    s[2] = (h.get(0) >> 16) & 0xFF;
    s[3] = ((h.get(0) >> 24) | (h.get(1) << 2)) & 0xFF;
    s[4] = (h.get(1) >> 6) & 0xFF;
    s[5] = (h.get(1) >> 14) & 0xFF;
    s[6] = ((h.get(1) >> 22) | (h.get(2) << 3)) & 0xFF;
    s[7] = (h.get(2) >> 5) & 0xFF;
    s[8] = (h.get(2) >> 13) & 0xFF;
    s[9] = ((h.get(2) >> 21) | (h.get(3) << 5)) & 0xFF;
    s[10] = (h.get(3) >> 3) & 0xFF;
    s[11] = (h.get(3) >> 11) & 0xFF;
    s[12] = ((h.get(3) >> 19) | (h.get(4) << 6)) & 0xFF;
    s[13] = (h.get(4) >> 2) & 0xFF;
    s[14] = (h.get(4) >> 10) & 0xFF;
    s[15] = (h.get(4) >> 18) & 0xFF;
    s[16] = h.get(5) & 0xFF;
    s[17] = (h.get(5) >> 8) & 0xFF;
    s[18] = (h.get(5) >> 16) & 0xFF;
    s[19] = ((h.get(5) >> 24) | (h.get(6) << 1)) & 0xFF;
    s[20] = (h.get(6) >> 7) & 0xFF;
    s[21] = (h.get(6) >> 15) & 0xFF;
    s[22] = ((h.get(6) >> 23) | (h.get(7) << 3)) & 0xFF;
    s[23] = (h.get(7) >> 5) & 0xFF;
    s[24] = (h.get(7) >> 13) & 0xFF;
    s[25] = ((h.get(7) >> 21) | (h.get(8) << 4)) & 0xFF;
    s[26] = (h.get(8) >> 4) & 0xFF;
    s[27] = (h.get(8) >> 12) & 0xFF;
    s[28] = ((h.get(8) >> 20) | (h.get(9) << 6)) & 0xFF;
    s[29] = (h.get(9) >> 2) & 0xFF;
    s[30] = (h.get(9) >> 10) & 0xFF;
    s[31] = (h.get(9) >> 18) & 0xFF;
}

function FeIsNegative(f: FieldElement): number {
    const s = new Uint8Array(32);
    FeToBytes(s, f);
    return s[0] & 1;
}

function FeIsNonZero(f: FieldElement): number {
    const s = new Uint8Array(32);
    FeToBytes(s, f);
    let x = 0;
    for (let i = 0; i < 32; i++) {
        x |= s[i];
    }
    x |= x >> 4;
    x |= x >> 2;
    x |= x >> 1;
    return x & 1;
}

function FeNeg(h: FieldElement, f: FieldElement): void {
    h.set(0, -f.get(0));
    h.set(1, -f.get(1));
    h.set(2, -f.get(2));
    h.set(3, -f.get(3));
    h.set(4, -f.get(4));
    h.set(5, -f.get(5));
    h.set(6, -f.get(6));
    h.set(7, -f.get(7));
    h.set(8, -f.get(8));
    h.set(9, -f.get(9));
}

function FeInvert(out: FieldElement, z: FieldElement): void {
    const t0 = new FieldElement();
    const t1 = new FieldElement();
    const t2 = new FieldElement();
    const t3 = new FieldElement();

    FeSquare(t0, z); // 2^1
    FeSquare(t1, t0); // 2^2
    for (let i = 1; i < 2; i++) { // 2^3
        FeSquare(t1, t1);
    }
    FeMul(t1, z, t1); // 2^3 + 2^0
    FeMul(t0, t0, t1); // 2^3 + 2^1 + 2^0
    FeSquare(t2, t0); // 2^4 + 2^2 + 2^1
    FeMul(t1, t1, t2); // 2^4 + 2^3 + 2^2 + 2^1 + 2^0
    FeSquare(t2, t1); // 5,4,3,2,1
    for (let i = 1; i < 5; i++) { // 9,8,7,6,5
        FeSquare(t2, t2);
    }
    FeMul(t1, t2, t1); // 9,8,7,6,5,4,3,2,1,0
    FeSquare(t2, t1); // 10..1
    for (let i = 1; i < 10; i++) { // 19..10
        FeSquare(t2, t2);
    }
    FeMul(t2, t2, t1); // 19..0
    FeSquare(t3, t2); // 20..1
    for (let i = 1; i < 20; i++) { // 39..20
        FeSquare(t3, t3);
    }
    FeMul(t2, t3, t2); // 39..0
    FeSquare(t2, t2); // 40..1
    for (let i = 1; i < 10; i++) { // 49..10
        FeSquare(t2, t2);
    }
    FeMul(t1, t2, t1); // 49..0
    FeSquare(t2, t1); // 50..1
    for (let i = 1; i < 50; i++) { // 99..50
        FeSquare(t2, t2);
    }
    FeMul(t2, t2, t1); // 99..0
    FeSquare(t3, t2); // 100..1
    for (let i = 1; i < 100; i++) { // 199..100
        FeSquare(t3, t3);
    }
    FeMul(t2, t3, t2); // 199..0
    FeSquare(t2, t2); // 200..1
    for (let i = 1; i < 50; i++) { // 249..50
        FeSquare(t2, t2);
    }
    FeMul(t1, t2, t1); // 249..0
    FeSquare(t1, t1); // 250..1
    for (let i = 1; i < 5; i++) { // 254..5
        FeSquare(t1, t1);
    }
    FeMul(out, t1, t0); // 254..5,3,1,0
}

function edwardsToMontgomeryX(outX: FieldElement, y: FieldElement): void {
    const oneMinusY = new FieldElement();
    FeOne(oneMinusY);
    FeSub(oneMinusY, oneMinusY, y);
    FeInvert(oneMinusY, oneMinusY);

    FeOne(outX);
    FeAdd(outX, outX, y);

    FeMul(outX, outX, oneMinusY);
}

export function ed2CurvePub(publicKey: Uint8Array): Uint8Array | null {
    const A = new ExtendedGroupElement();
    if (!A.FromBytes(publicKey)) {
        return null;
    }

    const x = new FieldElement();
    edwardsToMontgomeryX(x, A.Y);

    const curve25519Public = new Uint8Array(32);
    FeToBytes(curve25519Public, x);
    return curve25519Public;
}

export function ed2CurvePri(privateKey: Uint8Array) {
    const curve25519Private = new Uint8Array(32); // 计算 SHA-512 哈希，只取前32字节作为私钥
    const digest = sha512.arrayBuffer(privateKey.slice(0, 32));

    const digestUint8 = new Uint8Array(digest);

    digestUint8[0] &= 248;
    digestUint8[31] &= 127;
    digestUint8[31] |= 64;

    curve25519Private.set(digestUint8.slice(0, 32));

    return curve25519Private;
}