import { FC } from 'react'

export interface ToolDefine {
  name: string;
  label?: string;
  Icon: FC<any>;
  key: string[];
  activate: () => void;
  deactivate: () => void;
}
