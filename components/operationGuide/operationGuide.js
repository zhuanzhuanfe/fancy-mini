let guideStatus = {
  eleId: '',
  onActionStart: null,
  onActionFinish: null,
};


function operationGuideAction({eleId, eleReg}){
  return function (target, name, descriptor) {
    let oriFunc = descriptor.value;
    descriptor.value = async function (...args) {
      let guiding = (eleId===guideStatus.eleId) || (eleReg && eleReg.test(guideStatus.eleId)); //当前是否正在进行该处理函数对应的新手引导 
      guiding && guideStatus.onActionStart && guideStatus.onActionStart();
      let res = await oriFunc.apply(this, args);
      guiding && guideStatus.onActionFinish && guideStatus.onActionFinish();
      return res;
    }
  }
}

export {
  guideStatus,
  operationGuideAction,
}
