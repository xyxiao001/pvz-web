export interface Skeleton {
  armature: { name: string; frameRate: number; animation: { name: string; duration?: number; frame?: { duration?: number; sound?: string; events?: { name: string }[] }[] }[] }[];
}

// DragonBones frame events can sit at the animation's last frame (duration 0).
// Read that frame too: stopping at the preceding frame cuts off death and explosion cues.
// In the DragonBones format, omitted duration means 1 frame, and omitted frames/events mean empty.
export function animationTimeline(skeleton: Skeleton, armatureName: string, animationName: string) {
  const armature = skeleton.armature.find(a => a.name === armatureName)!;
  const animation = armature.animation.find(a => a.name === animationName)!;
  const events: Record<string, number> = {};
  let frame = 0;
  for (const item of animation.frame ?? []) {
    for (const event of item.events ?? []) events[event.name] = frame / armature.frameRate;
    if (item.sound) events[item.sound] = frame / armature.frameRate;
    frame += item.duration ?? 1;
  }
  return { duration: (animation.duration ?? 1) / armature.frameRate, events };
}

export interface CameraIntro {
  PanStartOffset: number; PanStreetOffset: number; PanEndOffset: number;
  PanLeftDuration: number; PanRightDuration: number; PanMoveRightTime: number; PanMoveLeftTime: number;
}
export function cubicInOut(t: number) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
export function introCamera(time: number, intro: CameraIntro, chooserX: number) {
  if (time < intro.PanLeftDuration) return intro.PanStartOffset;
  time -= intro.PanLeftDuration;
  if (time < intro.PanMoveRightTime) return intro.PanStartOffset + (intro.PanStreetOffset-intro.PanStartOffset)*cubicInOut(time/intro.PanMoveRightTime);
  time -= intro.PanMoveRightTime + intro.PanRightDuration;
  if (time < 0) return intro.PanStreetOffset;
  return intro.PanStreetOffset + (chooserX-intro.PanStreetOffset)*cubicInOut(Math.min(1,time/intro.PanMoveLeftTime));
}
