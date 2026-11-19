/**
 * Raymarched liquid-metal metaballs (shader ported from docs/design/artdir/wow/app/_src/core.js,
 * itself the approved landing shader + nucleus/extra-drop split (uN, uK2) + inner glow light (uGl)).
 * One program, one fullscreen triangle; every region is a viewport + scissor on the same canvas.
 */
import type { Cam } from "./math";
import type { Drop, ZoneSet } from "./shape";
import { EngraveAtlas, engraveKey, spanFor } from "./engrave";

const nrm3 = (a: number[]): [number, number, number] => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross3 = (a: number[], b: number[]): [number, number, number] => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const ss3 = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FS = (steps: number) => `precision highp float;
#define MAXS ${steps}
uniform vec4 uView;uniform vec3 uRo,uTa;uniform float uTan;
uniform vec4 uD[6];uniform vec3 uC[6];
uniform vec4 uZ[10];uniform vec3 uZC[10];uniform vec3 uZO;uniform float uZN,uZM,uFq,uPh;
uniform float uK,uK2,uN,uT,uWob,uTint,uShim,uShimPos,uRip,uAlpha,uGlow;uniform vec4 uB,uGl;
uniform vec4 uTl;uniform float uTlI;
uniform sampler2D uLg;uniform vec4 uLgD[6];uniform float uLgOn;
uniform vec4 uZL[6],uZT[6];uniform float uZLOn;
vec3 gR=vec3(1.,0.,0.),gU=vec3(0.,1.,0.);float gPx=.01;
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
/* round cone (iq): sphere a (r1) to sphere b (r2) with tangent walls. Used to stretch one action drop into a teardrop
   (pour: tail reaches the surface before the head arrives, so there is never a head-on-a-neck frame; sell: the thread thins and lets go). */
float rcone(vec3 p,vec3 a,vec3 b,float r1,float r2){vec3 ba=b-a;float l2=dot(ba,ba);float rr=r1-r2;
 if(l2<=rr*rr+1e-5)return r1>=r2?length(p-a)-r1:length(p-b)-r2;
 float a2=l2-rr*rr;float il2=1./l2;vec3 pa=p-a;float y=dot(pa,ba);float z=y-l2;vec3 xv=pa*l2-ba*y;float x2=dot(xv,xv);float y2=y*y*l2;float z2=z*z*l2;float k=sign(rr)*rr*rr*x2;
 if(sign(z)*a2*z2>k)return sqrt(x2+z2)*il2-r2;
 if(sign(y)*a2*y2<k)return sqrt(x2+y2)*il2-r1;
 return (sqrt(x2*a2*il2)+y*rr)*il2-r1;}
float body(vec3 p,vec4 d,float i){float r=max(d.w,.001);return abs(i-uTlI)<.5?rcone(p,d.xyz,uTl.xyz,r,max(uTl.w,.001)):length(p-d.xyz)-r;}
float dd(vec3 p,vec4 d,float i){vec3 q=p-d.xyz;float r=max(d.w,.001);float s=1./max(r,.25);
 float w=sin(q.x*2.6*s*uFq+uT*.8+i*1.7+uPh)*sin(q.y*2.3*s*uFq+uT*.6+i+uPh*.7)*sin(q.z*2.5*s*uFq+uT*.5+i*2.3);
 return body(p,d,i)+w*uWob*r*.045;}
float map(vec3 p){float d=1e3,e=1e3;for(int i=0;i<6;i++){float x=dd(p,uD[i],float(i));if(float(i)<uN)d=smin(d,x,uK);else e=smin(e,x,uK2);}d=smin(d,e,uK2);
 float l=length(p-uB.xyz);d+=uRip*.035*sin(l*13.-uT*7.)*exp(-l*.6);return d;}
vec3 nrm(vec3 p){vec2 e=vec2(.0015,-.0015);return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}
float seam=0.;
/* stock tint: zones (weighted partition of the form's surface, thin dark seams) mixed (uZM) with each form drop's own colour;
   action drops (slots >= uN) keep their own colour. */
vec3 tintAt(vec3 p){
 float db=1e3;vec3 cn=vec3(0.);float wn=0.;vec3 ca=vec3(0.);float wa=0.;
 for(int i=0;i<6;i++){float r=uD[i].w;float d=body(p,uD[i],float(i));float w=exp(clamp(-d*7.,-30.,8.))*step(.02,r);if(float(i)<uN){db=min(db,d);cn+=uC[i]*w;wn+=w;}else{ca+=uC[i]*w;wa+=w;}}
 vec3 base=cn/max(wn,1e-6);seam=0.;
 if(uZN>0.){vec3 dr=normalize(p-uZO);float b1=-1e3,b2=-1e3;vec3 acc=vec3(0.);float ws=0.;
  for(int i=0;i<10;i++){if(float(i)>=uZN)break;float s=dot(dr,uZ[i].xyz)+uZ[i].w;float w=exp(clamp(s*16.,-40.,40.));acc+=uZC[i]*w;ws+=w;if(s>b1){b2=b1;b1=s;}else if(s>b2){b2=s;}}
  base=mix(base,acc/max(ws,1e-6),uZM);seam=uZN>1.?(1.-smoothstep(0.,.03,b1-b2))*uZM:0.;}
 float wb=exp(clamp(-max(db,0.)*7.,-30.,8.));seam*=wb/(wb+wa+1e-5);
 return (base*wb+ca)/(wb+wa+1e-5);}
float box(float x,float a,float b,float e){return smoothstep(a-e,a+e,x)*(1.-smoothstep(b-e,b+e,x));}
vec3 env(vec3 r){float az=atan(r.x,r.z);float y=r.y;
 vec3 c=mix(vec3(.018,.019,.022),vec3(.10,.105,.115),smoothstep(0.,.95,y));
 c+=vec3(1.,.99,.97)*3.0*box(y,.70,1.1,.025)*box(r.x,-.42,.42,.03);
 c+=vec3(.95,.97,1.)*2.6*box(az,.92,1.02,.012)*box(y,-.25,.62,.03);
 c+=vec3(.95,.97,1.)*1.6*box(az,1.12,1.16,.01)*box(y,-.2,.55,.03);
 c+=vec3(1.)*1.5*box(az,-1.72,-1.52,.02)*box(y,-.15,.7,.03);
 c+=vec3(.8,.84,.9)*.55*box(az,-.55,.15,.25)*box(y,.05,.45,.15);
 c+=vec3(.95,.58,.36)*1.7*box(az,2.35,2.75,.08)*box(y,-.35,.25,.08);
 c+=vec3(.9,.92,.95)*.7*exp(-pow(y*30.,2.));
 c*=mix(.12,1.,smoothstep(-.06,.0,y));
 c+=vec3(.015)*smoothstep(-.1,-1.,y);
 return c;}
/* engraving (concept video decal): camera-facing planar projection on each engraved drop's front cap, upright.
   uLgD[i] = (atlas col, row, strength, decal span in radii). lgM = recess mask, lgG = bevel gradient (world). */
float lgM=0.;vec3 lgG=vec3(0.);
void logoAt(vec3 p){lgM=0.;lgG=vec3(0.);if(uLgOn<.5)return;
 for(int i=0;i<6;i++){vec4 L=uLgD[i];if(L.z<.002)continue;
  vec3 c=uD[i].xyz;float r=uD[i].w;if(r<.05)continue;
  float d=length(p-c)-r;float near=exp(-abs(d)*16.);if(near<.01)continue;
  vec3 q=(p-c)/r;float fc=smoothstep(.3,.62,dot(normalize(q),normalize(uRo-c)));if(fc<.001)continue;
  vec2 uv=vec2(dot(q,gR),dot(q,gU));float a=.06*sin(uT*.45+float(i)*1.7);uv=vec2(cos(a)*uv.x-sin(a)*uv.y,sin(a)*uv.x+cos(a)*uv.y);
  float sp=L.w*mix(1.2,1.,smoothstep(26.,60.,r/gPx)); // small drops: the mark spreads over more of the cap
  vec2 t=uv/sp+.5;if(t.x<0.||t.x>1.||t.y<0.||t.y>1.)continue;
  vec2 tc=(L.xy+vec2(t.x,1.-t.y))*.25;float e=1.6/1024.;
  vec3 s=texture2D(uLg,tc).rgb;
  float fp=gPx*256./(sp*r); // texels per screen pixel: minified marks read the softer channels instead of shimmering
  float m=mix(s.r,s.b,smoothstep(1.,2.4,fp));m=mix(m,min(1.,s.g*1.35),smoothstep(6.,14.,fp));
  float gx=texture2D(uLg,tc+vec2(e,0.)).g-texture2D(uLg,tc-vec2(e,0.)).g;
  float gy=texture2D(uLg,tc-vec2(0.,e)).g-texture2D(uLg,tc+vec2(0.,e)).g;
  float w=L.z*near*fc*(1.-smoothstep(16.,26.,fp));
  lgM+=m*w;lgG+=(gx*gR+gy*gU)*w;}
 lgM=clamp(lgM,0.,1.);}
/* zone logos on a fused form (founder option B): each stock's mark engraved inside its own tint zone.
   uZL[i] = (zone centroid direction from uZO, strength), uZT[i] = (atlas col, row, half-size in tangent units, zone index).
   Gnomonic projection around the centroid, upright to the camera; clipped to the zone's own area (never over a seam);
   faded on the turning-away side and when it would be tiny. Subtler than the drop engraving (recess ~55% darker). */
float zlM=0.;
void zoneLogoAt(vec3 p){zlM=0.;if(uZLOn<.5||uZN<.5)return;
 float da=1e3;for(int i=0;i<6;i++){if(float(i)<uN)continue;float r=uD[i].w;if(r>.005)da=min(da,length(p-uD[i].xyz)-r);}
 if(da<.06)return; // action drops (pour / sell) keep their own look
 vec3 q=p-uZO;float dl=length(q);vec3 dr=q/max(dl,1e-4);
 float fc=smoothstep(.12,.42,dot(dr,normalize(uRo-p)));if(fc<.001)return;
 for(int i=0;i<6;i++){vec4 Z0=uZL[i];if(Z0.w<.002)continue;vec4 T=uZT[i];
  vec3 d=Z0.xyz;float c=dot(dr,d);if(c<.55)continue;
  vec3 tU=normalize(gU-d*dot(gU,d));vec3 tR=cross(tU,d);
  vec2 uv=vec2(dot(dr,tR),dot(dr,tU))/c;
  vec2 t=uv/(2.*T.z)+.5;if(t.x<0.||t.x>1.||t.y<0.||t.y>1.)continue;
  float si=-1e3,so=-1e3;
  for(int k=0;k<10;k++){if(float(k)>=uZN)break;float s=dot(dr,uZ[k].xyz)+uZ[k].w;if(abs(float(k)-T.w)<.5)si=s;else so=max(so,s);}
  float own=smoothstep(.035,.07,si-so);if(own<.001)continue;
  vec2 tc=(T.xy+vec2(t.x,1.-t.y))*.25;float e=1.6/1024.;
  vec3 sm=texture2D(uLg,tc).rgb;
  float cpx=2.*T.z*dl/gPx; // cell width in screen px
  float fp=256./max(cpx,1.);
  float m=mix(sm.r,sm.b,smoothstep(1.,2.4,fp));m=mix(m,min(1.,sm.g*1.35),smoothstep(6.,14.,fp));
  float gx=texture2D(uLg,tc+vec2(e,0.)).g-texture2D(uLg,tc-vec2(e,0.)).g;
  float gy=texture2D(uLg,tc-vec2(0.,e)).g-texture2D(uLg,tc+vec2(0.,e)).g;
  float w=Z0.w*fc*own*smoothstep(14.,22.,cpx*.8);
  zlM+=m*w;lgG+=(gx*tR+gy*tU)*w*.75;}
 zlM=clamp(zlM,0.,1.);}
vec3 shade(vec3 p,vec3 rd){vec3 n=nrm(p);logoAt(p);zoneLogoAt(p);n=normalize(n+lgG*1.5);vec3 r=reflect(rd,n);vec3 tn=tintAt(p);
 vec3 F0=mix(vec3(.92),tn,clamp(uTint,0.,.85));float ct=clamp(dot(n,-rd),0.,1.);
 vec3 F=F0+(1.-F0)*pow(1.-ct,5.);
 float ao=clamp(map(p+n*.2)/.2,0.,1.);ao=.45+.55*ao;
 vec3 col=env(r)*F*ao;
 col+=tn*(.04+.16*pow(1.-ct,2.))*ao*uTint;
 col*=1.-.42*seam*uTint;
 col=mix(col,col*.28+tn*.035+vec3(.03),lgM);
 col=mix(col,col*.45+tn*.03+vec3(.02),zlM);
 col+=vec3(1.,.98,.95)*min(length(lgG)*.45,.3);
 float b=exp(-pow((dot(p,normalize(vec3(.8,.5,.3)))-uShimPos)*3.2,2.))*uShim;
 col+=vec3(1.,.84,.70)*b*1.6*(.35+.65*pow(1.-ct,1.5));
 float gd=length(p-uGl.xyz);col+=vec3(1.,.86,.72)*uGl.w*exp(-gd*gd*7.)*(.25+.75*ct);
 return col;}
void main(){vec2 uv=((gl_FragCoord.xy-uView.xy)/uView.zw)*2.-1.;float asp=uView.z/uView.w;
 vec3 f=normalize(uTa-uRo);vec3 rr=normalize(cross(f,vec3(0.,1.,0.)));vec3 u=cross(rr,f);
 vec3 rd=normalize(f+uv.x*asp*uTan*rr+uv.y*uTan*u);gR=rr;gU=u;
 vec3 oc=uRo-uB.xyz;float b=dot(oc,rd);float c=dot(oc,oc)-uB.w*uB.w;float h=b*b-c;
 if(h<0.){gl_FragColor=vec4(0.);return;}
 h=sqrt(h);float t=max(-b-h,0.);float te=-b+h;float md=1e3;float tm=t;bool hit=false;
 for(int i=0;i<MAXS;i++){vec3 p=uRo+rd*t;float d=map(p);if(d<md){md=d;tm=t;}if(d<.0012*t){hit=true;tm=t;break;}t+=d*.82;if(t>te)break;}
 float px=2.*uTan/uView.w*tm;float a=hit?1.:1.-smoothstep(0.,px*1.6,md);
 vec3 col=vec3(0.);gPx=px;if(a>0.){col=shade(uRo+rd*tm,rd);}
 col=col*(2.51*col+.03)/(col*(2.43*col+.59)+.14);
 col=pow(clamp(col,0.,1.),vec3(.4545));
 float g=exp(-max(md,0.)*3.2)*uGlow*(1.-a);
 gl_FragColor=vec4((col*a+vec3(.75,.62,.55)*g)*uAlpha,a*uAlpha);}
`;

export type DrawOpts = {
  /** smooth-min for the nucleus (first `n` drops) */
  k?: number;
  /** smooth-min for extra drops (pour / sell) joining the nucleus */
  k2?: number;
  /** number of nucleus drops; the rest are "extra" */
  n?: number;
  t: number;
  wob?: number;
  tint?: number;
  shim?: number;
  shimPos?: number;
  rip?: number;
  alpha?: number;
  glow?: number;
  /** inner glow light [x, y, z, strength] */
  light?: [number, number, number, number];
  /** stock tint zones of the form (from posedDrops) */
  zone?: ZoneSet | null;
  /**
   * Teardrop: stretch drop `i` (an action slot, >= n) into a round cone ending at sphere {p, r}.
   * Pour: the tail reaches the surface before the head does. Sell: the thread between bud and form thins and lets go.
   */
  tail?: { i: number; p: [number, number, number]; r: number } | null;
  /**
   * Zone logos 0..1 (fused forms only): engrave each stock's mark inside its own tint zone (top 6 zones by weight,
   * ≥ 8%, facing the camera, sized by sqrt(weight) and shrunk until it sits fully inside its zone). Default off.
   */
  zl?: number;
  /** zone mix 0..1 (0 = each form drop shows its own colour) */
  zm?: number;
  /** tint strength when zones are on (designer default .5) */
  zt?: number;
};

const UNIFORMS = ["uView", "uRo", "uTa", "uTan", "uD", "uC", "uZ", "uZC", "uZO", "uZN", "uZM", "uFq", "uPh", "uK", "uK2", "uN", "uT", "uWob", "uTint", "uShim", "uShimPos", "uRip", "uAlpha", "uGlow", "uB", "uGl", "uTl", "uTlI", "uLg", "uLgD", "uLgOn", "uZL", "uZT", "uZLOn"] as const;

export class MetalRenderer {
  readonly gl: WebGLRenderingContext;
  private prog: WebGLProgram | null = null;
  private U: Partial<Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>> = {};
  private D = new Float32Array(24);
  private C = new Float32Array(18);
  private LG = new Float32Array(24);
  private ZL = new Float32Array(24);
  private ZT = new Float32Array(24);
  private atlas: EngraveAtlas | null = null;
  steps = 0;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
  }

  static create(canvas: HTMLCanvasElement): MetalRenderer | null {
    const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" }) as WebGLRenderingContext | null;
    return gl ? new MetalRenderer(gl) : null;
  }

  /** (Re)compile for a raymarch step budget (desktop 80, phone 52). Returns false if the shader fails. */
  build(steps: number): boolean {
    const gl = this.gl;
    if (this.prog && this.steps === steps) return true;
    if (this.prog) gl.deleteProgram(this.prog);
    const sh = (type: number, src: string) => {
      const o = gl.createShader(type)!;
      gl.shaderSource(o, src);
      gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error("[metal]", gl.getShaderInfoLog(o));
      return o;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS(steps)));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of UNIFORMS) this.U[n] = gl.getUniformLocation(prog, n);
    gl.enable(gl.SCISSOR_TEST);
    this.atlas = this.atlas ?? new EngraveAtlas(gl);
    this.atlas.bind();
    gl.uniform1i(this.U.uLg!, 0);
    this.prog = prog;
    this.steps = steps;
    return true;
  }

  clear(w: number, h: number) {
    const gl = this.gl;
    this.atlas?.tick();
    gl.clearColor(0, 0, 0, 0);
    gl.scissor(0, 0, w, h);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /** Fill uZL / uZT for the zone logos of one fused form. Returns 1 when at least one zone is engraved. */
  private zoneLogos(z: ZoneSet, cam: Cam, strength: number): number {
    const L = z.L;
    if (!L || !L.length || !this.atlas) return 0;
    const ZL = this.ZL, ZT = this.ZT;
    ZL.fill(0);
    ZT.fill(0);
    const nz = Math.min(10, z.n);
    const f = nrm3([cam.ta[0] - cam.ro[0], cam.ta[1] - cam.ro[1], cam.ta[2] - cam.ro[2]]);
    const r = nrm3(cross3(f, [0, 1, 0]));
    const u = cross3(r, f);
    const toCam = nrm3([cam.ro[0] - z.zo[0], cam.ro[1] - z.zo[1], cam.ro[2] - z.zo[2]]);
    const score = (v: number[], k: number) => v[0] * z.Z[k * 4] + v[1] * z.Z[k * 4 + 1] + v[2] * z.Z[k * 4 + 2] + z.Z[k * 4 + 3];
    // owned with margin: this zone beats every other zone by > .07 at v (seam is ~.03 wide)
    const owns = (v: number[], k: number) => {
      const sk = score(v, k);
      for (let j = 0; j < nz; j++) if (j !== k && score(v, j) > sk - 0.07) return false;
      return true;
    };
    const order = L.map((x, k) => ({ ...x, k })).filter((x) => x.k < nz && x.w >= 0.08).sort((a, b) => b.w - a.w).slice(0, 6);
    let slot = 0, on = 0;
    for (const x of order) {
      const d = nrm3(x.dir as number[]);
      const facing = ss3(0.5, 0.78, d[0] * toCam[0] + d[1] * toCam[1] + d[2] * toCam[2]); // whole mark on the visible side, never a sliver at the rim
      if (facing < 0.01) continue;
      const key = engraveKey(x.t);
      if (!key) continue;
      // tangent frame upright to the camera
      const du = u[0] * d[0] + u[1] * d[1] + u[2] * d[2];
      const tU = nrm3([u[0] - d[0] * du, u[1] - d[1] * du, u[2] - d[2] * du]);
      const tR = cross3(tU, d);
      let s = Math.min(0.34, Math.max(0.13, 0.46 * Math.sqrt(x.w)));
      let fits = false;
      for (let it = 0; it < 7 && s >= 0.085; it++) {
        const m = 0.82 * s; // the mark fills ~80% of its cell
        fits = owns(d, x.k);
        for (let a = 0; a < 8 && fits; a++) {
          const ang = (a / 8) * Math.PI * 2;
          const ca = Math.cos(ang) * m, sa = Math.sin(ang) * m;
          if (!owns(nrm3([d[0] + tR[0] * ca + tU[0] * sa, d[1] + tR[1] * ca + tU[1] * sa, d[2] + tR[2] * ca + tU[2] * sa]), x.k)) fits = false;
        }
        if (fits) break;
        s *= 0.86;
      }
      if (!fits) continue;
      const cell = this.atlas.cell(key);
      if (!cell) continue;
      ZL.set([d[0], d[1], d[2], Math.min(1, strength) * facing], slot * 4);
      ZT.set([cell[0], cell[1], s, x.k], slot * 4);
      slot++;
      on = 1;
    }
    return on;
  }

  /** view / scissor: [x, y, w, h] in device px, GL origin (bottom-left). */
  draw(view: number[], scissor: number[], cam: Cam, drops: (Drop | null | undefined)[], o: DrawOpts) {
    const gl = this.gl, U = this.U, D = this.D, C = this.C;
    let cx = 0, cy = 0, cz = 0, n = 0, R = 0;
    for (let i = 0; i < 6; i++) {
      const d = drops[i];
      if (d && d.r > 0.005) {
        D[i * 4] = d.p[0]; D[i * 4 + 1] = d.p[1]; D[i * 4 + 2] = d.p[2]; D[i * 4 + 3] = d.r;
        C[i * 3] = d.c[0]; C[i * 3 + 1] = d.c[1]; C[i * 3 + 2] = d.c[2];
        cx += d.p[0]; cy += d.p[1]; cz += d.p[2]; n++;
      } else {
        D[i * 4] = 0; D[i * 4 + 1] = 60 + i * 5; D[i * 4 + 2] = 0; D[i * 4 + 3] = 0;
        C[i * 3] = C[i * 3 + 1] = C[i * 3 + 2] = 1;
      }
    }
    if (!n) return;
    cx /= n; cy /= n; cz /= n;
    for (let i = 0; i < 6; i++) {
      const d = drops[i];
      if (d && d.r > 0.005) R = Math.max(R, Math.hypot(d.p[0] - cx, d.p[1] - cy, d.p[2] - cz) + d.r);
    }
    gl.viewport(view[0], view[1], view[2], view[3]);
    gl.scissor(scissor[0], scissor[1], scissor[2], scissor[3]);
    gl.uniform4f(U.uView!, view[0], view[1], view[2], view[3]);
    gl.uniform3fv(U.uRo!, cam.ro);
    gl.uniform3fv(U.uTa!, cam.ta);
    gl.uniform1f(U.uTan!, cam.tan);
    gl.uniform4fv(U.uD!, D);
    // engravings: per drop (atlas cell, strength, span); skipped entirely when no drop asks for one
    const LG = this.LG;
    let lgOn = 0;
    LG.fill(0);
    for (let i = 0; i < 6; i++) {
      const d = drops[i];
      const lw = d && d.logo && d.r > 0.05 ? (d.lw ?? 1) : 0;
      if (lw <= 0.002 || !this.atlas) continue;
      const key = engraveKey(d!.logo);
      const cell = key ? this.atlas.cell(key) : null;
      if (!cell) continue;
      LG[i * 4] = cell[0]; LG[i * 4 + 1] = cell[1]; LG[i * 4 + 2] = Math.min(1, lw); LG[i * 4 + 3] = spanFor(key!);
      lgOn = 1;
    }
    gl.uniform1f(U.uLgOn!, lgOn);
    if (lgOn) gl.uniform4fv(U.uLgD!, LG);
    gl.uniform3fv(U.uC!, C);
    const z = o.zone;
    gl.uniform1f(U.uZN!, z ? z.n : 0);
    if (z) {
      gl.uniform4fv(U.uZ!, z.Z);
      gl.uniform3fv(U.uZC!, z.ZC);
      gl.uniform3fv(U.uZO!, z.zo);
    }
    gl.uniform1f(U.uZM!, z ? (o.zm ?? 1) : 0);
    const zlOn = z && (o.zl ?? 0) > 0.002 && this.atlas ? this.zoneLogos(z, cam, o.zl!) : 0;
    gl.uniform1f(U.uZLOn!, zlOn);
    if (zlOn) {
      gl.uniform4fv(U.uZL!, this.ZL);
      gl.uniform4fv(U.uZT!, this.ZT);
    }
    gl.uniform1f(U.uFq!, z ? z.fq : 1);
    gl.uniform1f(U.uPh!, z ? z.ph : 0);
    gl.uniform1f(U.uK!, o.k ?? 0.8);
    gl.uniform1f(U.uK2!, o.k2 ?? 0.32);
    gl.uniform1f(U.uN!, o.n ?? (z ? 4 : 6));
    gl.uniform1f(U.uT!, o.t);
    gl.uniform1f(U.uWob!, (o.wob ?? 1) * (z ? z.wob : 1));
    gl.uniform1f(U.uTint!, z ? (o.zt ?? 0.5) : (o.tint ?? 0.3));
    gl.uniform1f(U.uShim!, o.shim ?? 0);
    gl.uniform1f(U.uShimPos!, o.shimPos ?? 0);
    gl.uniform1f(U.uRip!, o.rip ?? 0);
    gl.uniform1f(U.uAlpha!, o.alpha ?? 1);
    gl.uniform1f(U.uGlow!, o.glow ?? 0);
    const l = o.light ?? [0, 0, 0, 0];
    gl.uniform4f(U.uGl!, l[0], l[1], l[2], l[3]);
    const tl = o.tail;
    const tailOn = !!tl && tl.r > 0.002 && !!drops[tl.i] && drops[tl.i]!.r > 0.005;
    if (tailOn) R = Math.max(R, Math.hypot(tl!.p[0] - cx, tl!.p[1] - cy, tl!.p[2] - cz) + tl!.r);
    gl.uniform4f(U.uTl!, tailOn ? tl!.p[0] : 0, tailOn ? tl!.p[1] : 0, tailOn ? tl!.p[2] : 0, tailOn ? tl!.r : 0);
    gl.uniform1f(U.uTlI!, tailOn ? tl!.i : -1);
    gl.uniform4f(U.uB!, cx, cy, cz, R + 0.35 + (o.glow ? 0.9 : 0));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
