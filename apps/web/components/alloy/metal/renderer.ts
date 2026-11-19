/**
 * Raymarched liquid-metal metaballs (shader ported from docs/design/artdir/wow/app/_src/core.js,
 * itself the approved landing shader + nucleus/extra-drop split (uN, uK2) + inner glow light (uGl)).
 * One program, one fullscreen triangle; every region is a viewport + scissor on the same canvas.
 */
import type { Cam } from "./math";
import type { Drop, ZoneSet } from "./shape";

const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FS = (steps: number) => `precision highp float;
#define MAXS ${steps}
uniform vec4 uView;uniform vec3 uRo,uTa;uniform float uTan;
uniform vec4 uD[6];uniform vec3 uC[6];
uniform vec4 uZ[10];uniform vec3 uZC[10];uniform vec3 uZO;uniform float uZN,uZM,uFq,uPh;
uniform float uK,uK2,uN,uT,uWob,uTint,uShim,uShimPos,uRip,uAlpha,uGlow;uniform vec4 uB,uGl;
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
float dd(vec3 p,vec4 d,float i){vec3 q=p-d.xyz;float r=max(d.w,.001);float s=1./max(r,.25);
 float w=sin(q.x*2.6*s*uFq+uT*.8+i*1.7+uPh)*sin(q.y*2.3*s*uFq+uT*.6+i+uPh*.7)*sin(q.z*2.5*s*uFq+uT*.5+i*2.3);
 return length(q)-r+w*uWob*r*.045;}
float map(vec3 p){float d=1e3,e=1e3;for(int i=0;i<6;i++){float x=dd(p,uD[i],float(i));if(float(i)<uN)d=smin(d,x,uK);else e=smin(e,x,uK2);}d=smin(d,e,uK2);
 float l=length(p-uB.xyz);d+=uRip*.035*sin(l*13.-uT*7.)*exp(-l*.6);return d;}
vec3 nrm(vec3 p){vec2 e=vec2(.0015,-.0015);return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}
float seam=0.;
/* stock tint: zones (weighted partition of the form's surface, thin dark seams) mixed (uZM) with each form drop's own colour;
   action drops (slots >= uN) keep their own colour. */
vec3 tintAt(vec3 p){
 float db=1e3;vec3 cn=vec3(0.);float wn=0.;vec3 ca=vec3(0.);float wa=0.;
 for(int i=0;i<6;i++){float r=uD[i].w;float d=length(p-uD[i].xyz)-r;float w=exp(clamp(-d*7.,-30.,8.))*step(.02,r);if(float(i)<uN){db=min(db,d);cn+=uC[i]*w;wn+=w;}else{ca+=uC[i]*w;wa+=w;}}
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
vec3 shade(vec3 p,vec3 rd){vec3 n=nrm(p);vec3 r=reflect(rd,n);vec3 tn=tintAt(p);
 vec3 F0=mix(vec3(.92),tn,clamp(uTint,0.,.85));float ct=clamp(dot(n,-rd),0.,1.);
 vec3 F=F0+(1.-F0)*pow(1.-ct,5.);
 float ao=clamp(map(p+n*.2)/.2,0.,1.);ao=.45+.55*ao;
 vec3 col=env(r)*F*ao;
 col+=tn*(.04+.16*pow(1.-ct,2.))*ao*uTint;
 col*=1.-.42*seam*uTint;
 float b=exp(-pow((dot(p,normalize(vec3(.8,.5,.3)))-uShimPos)*3.2,2.))*uShim;
 col+=vec3(1.,.84,.70)*b*1.6*(.35+.65*pow(1.-ct,1.5));
 float gd=length(p-uGl.xyz);col+=vec3(1.,.86,.72)*uGl.w*exp(-gd*gd*7.)*(.25+.75*ct);
 return col;}
void main(){vec2 uv=((gl_FragCoord.xy-uView.xy)/uView.zw)*2.-1.;float asp=uView.z/uView.w;
 vec3 f=normalize(uTa-uRo);vec3 rr=normalize(cross(f,vec3(0.,1.,0.)));vec3 u=cross(rr,f);
 vec3 rd=normalize(f+uv.x*asp*uTan*rr+uv.y*uTan*u);
 vec3 oc=uRo-uB.xyz;float b=dot(oc,rd);float c=dot(oc,oc)-uB.w*uB.w;float h=b*b-c;
 if(h<0.){gl_FragColor=vec4(0.);return;}
 h=sqrt(h);float t=max(-b-h,0.);float te=-b+h;float md=1e3;float tm=t;bool hit=false;
 for(int i=0;i<MAXS;i++){vec3 p=uRo+rd*t;float d=map(p);if(d<md){md=d;tm=t;}if(d<.0012*t){hit=true;tm=t;break;}t+=d*.82;if(t>te)break;}
 float px=2.*uTan/uView.w*tm;float a=hit?1.:1.-smoothstep(0.,px*1.6,md);
 vec3 col=vec3(0.);if(a>0.){col=shade(uRo+rd*tm,rd);}
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
  /** zone mix 0..1 (0 = each form drop shows its own colour) */
  zm?: number;
  /** tint strength when zones are on (designer default .5) */
  zt?: number;
};

const UNIFORMS = ["uView", "uRo", "uTa", "uTan", "uD", "uC", "uZ", "uZC", "uZO", "uZN", "uZM", "uFq", "uPh", "uK", "uK2", "uN", "uT", "uWob", "uTint", "uShim", "uShimPos", "uRip", "uAlpha", "uGlow", "uB", "uGl"] as const;

export class MetalRenderer {
  readonly gl: WebGLRenderingContext;
  private prog: WebGLProgram | null = null;
  private U: Partial<Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>> = {};
  private D = new Float32Array(24);
  private C = new Float32Array(18);
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
    this.prog = prog;
    this.steps = steps;
    return true;
  }

  clear(w: number, h: number) {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.scissor(0, 0, w, h);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
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
    gl.uniform3fv(U.uC!, C);
    const z = o.zone;
    gl.uniform1f(U.uZN!, z ? z.n : 0);
    if (z) {
      gl.uniform4fv(U.uZ!, z.Z);
      gl.uniform3fv(U.uZC!, z.ZC);
      gl.uniform3fv(U.uZO!, z.zo);
    }
    gl.uniform1f(U.uZM!, z ? (o.zm ?? 1) : 0);
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
    gl.uniform4f(U.uB!, cx, cy, cz, R + 0.35 + (o.glow ? 0.9 : 0));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
