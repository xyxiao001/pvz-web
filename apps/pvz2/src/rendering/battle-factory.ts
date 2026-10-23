import { MeshSimple, Sprite, Texture, type ObservablePoint, type UpdateTransformOptions } from 'pixi.js';
import { BaseObject, PixiFactory, PixiSlot, type Armature, type BuildArmaturePackage, type SlotData } from 'pixi-dragonbones-runtime';

/** DragonBones supplies a whole transform at once; notify Pixi once per slot. */
export class BoneSprite extends Sprite {
  private batching = false;
  private transformChanged = false;
  private skewChanged = false;

  override _onUpdate(point?: ObservablePoint) {
    if (this.batching) {
      this.transformChanged = true;
      if (point === this.skew) this.skewChanged = true;
    } else super._onUpdate(point);
  }

  override updateTransform(options: Partial<UpdateTransformOptions>): this {
    this.batching = true;
    super.updateTransform(options);
    this.batching = false;
    if (this.transformChanged) super._onUpdate(this.skewChanged ? this.skew : undefined);
    this.transformChanged = this.skewChanged = false;
    return this;
  }
}

export class BattleFactory extends PixiFactory {
  protected override _buildSlot(_data: BuildArmaturePackage, data: SlotData, armature: Armature) {
    const slot = BaseObject.borrowObject(PixiSlot);
    slot.init(data, armature, new BoneSprite(Texture.EMPTY), new MeshSimple({ texture: Texture.EMPTY }));
    return slot;
  }
}
