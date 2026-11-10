#import <React/RCTBridgeModule.h>
@interface RCT_EXTERN_MODULE(TelephonyModule, NSObject)
RCT_EXTERN_METHOD(getSnapshot:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
