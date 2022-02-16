import type paper from 'paper'
import { Color } from 'paper'


export enum StrokeWhere {
  Inside = 'Inside',
  Outside = 'Outside',
  Center = 'Center',
}

export interface ShapeStyle {
  fill?: paper.Color;
  stroke?: {
    color: paper.Color;
    width: number;
    where: StrokeWhere;
  };
}

export const defaultStrokeStyle: ShapeStyle = {
  stroke: {
    color: new Color('#333'),
    width: 2,
    where: StrokeWhere.Center,
  },
}
