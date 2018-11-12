/**
 * 步骤并合修饰器，避免公共步骤并发进行
 * 该功能已在免并发修饰器中统一抽象，本文件仅作 兼容旧代码 使用
 */
export {mergingStep} from './noConcurrent';
