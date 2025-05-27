#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <UserNotifications/UserNotifications.h>
#import <RNCPushNotificationIOS.h> // AJOUT IMPORTANT


@interface AppDelegate () <UNUserNotificationCenterDelegate>
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"main";

  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  
  // Configuration des notifications push
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;
  
  [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert | 
                                          UNAuthorizationOptionSound | 
                                          UNAuthorizationOptionBadge)
                    completionHandler:^(BOOL granted, NSError * _Nullable error) {
                      if (error) {
                        NSLog(@"Error requesting notification authorization: %@", error);
                      } else {
                        NSLog(@"Notification authorization: %@", granted ? @"granted" : @"denied");
                        
                        if (granted) {
                          dispatch_async(dispatch_get_main_queue(), ^{
                            [application registerForRemoteNotifications];
                          });
                        }
                      }
                    }];

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Linking API
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [super application:application openURL:url options:options] || [RCTLinkingManager application:application openURL:url options:options];
}

// Universal Links
- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
  BOOL result = [RCTLinkingManager application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
  return [super application:application continueUserActivity:userActivity restorationHandler:restorationHandler] || result;
}

// MODIFICATION: Ajouter l'appel à RNCPushNotificationIOS
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [RNCPushNotificationIOS didRegisterForRemoteNotificationsWithDeviceToken:deviceToken]; // AJOUT
  return [super application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

// MODIFICATION: Ajouter l'appel à RNCPushNotificationIOS
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  NSLog(@"Failed to register for remote notifications: %@", error);
  [RNCPushNotificationIOS didFailToRegisterForRemoteNotificationsWithError:error]; // AJOUT
  return [super application:application didFailToRegisterForRemoteNotificationsWithError:error];
}

// MODIFICATION: Ajouter l'appel à RNCPushNotificationIOS
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  [RNCPushNotificationIOS didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler]; // AJOUT
  return [super application:application didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}

// AJOUT: Méthode pour les notifications locales (iOS < 10)
- (void)application:(UIApplication *)application didReceiveLocalNotification:(UILocalNotification *)notification
{
  [RNCPushNotificationIOS didReceiveLocalNotification:notification];
}

#pragma mark - UNUserNotificationCenterDelegate

// Called when a notification is delivered to a foreground app
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler {
  NSDictionary *userInfo = notification.request.content.userInfo;
  
  // Log notification for debugging
  NSLog(@"Received notification in foreground: %@", userInfo);
  
  // Allow displaying notification when app is in foreground
  completionHandler(UNNotificationPresentationOptionBadge | 
                   UNNotificationPresentationOptionSound | 
                   UNNotificationPresentationOptionAlert);
}

// MODIFICATION: Ajouter l'appel à RNCPushNotificationIOS
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
didReceiveNotificationResponse:(UNNotificationResponse *)response
         withCompletionHandler:(void(^)(void))completionHandler {
  NSDictionary *userInfo = response.notification.request.content.userInfo;
  
  // Log user interaction with notification
  NSLog(@"User interacted with notification: %@", userInfo);
  
  // AJOUT IMPORTANT: Notifier RNCPushNotificationIOS
  [RNCPushNotificationIOS didReceiveNotificationResponse:response];
  
  completionHandler();
}

@end