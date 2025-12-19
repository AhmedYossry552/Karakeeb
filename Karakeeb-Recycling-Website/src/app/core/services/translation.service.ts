import { Injectable, signal } from '@angular/core';

export interface Translations {
  [key: string]: string | Translations;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private translations: { [locale: string]: Translations } = {
    en: {
      navbar: {
        title: 'Karakeeb',
        home: 'Home',
        marketplace: 'Market place',
        categories: 'Categories',
        ecoAssist: 'Eco-Assist',
        myCollection: 'My Collection',
        myCart: 'Cart',
        profile: 'My Profile',
        settings: 'Settings',
        signOut: 'Sign Out',
        login: 'Login',
        startRecycling: 'Start Recycling',
        logout: 'Logout',
        language: 'Language',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode',
        ewallet: 'E-Wallet',
        items: 'items',
        viewFullCollection: 'View Full Collection',
        yourCollectionEmpty: 'Your collection is empty',
        notifications: 'Notifications'
      },
      footer: {
        title: 'Karakeeb',
        slogan: 'Recycle smarter, live cleaner.',
        quickLinks: 'Quick Links',
        FAQ: 'FAQ',
        about: 'About',
        cart: 'Cart',
        contact: 'Contact',
        rewarding: 'Recycling Rewards',
        rights: 'All rights reserved.',
        ContactUs: 'Contact Us',
        'Eco-Friendly Platform': 'Eco-Friendly Platform',
        support: 'Support'
      },
      indexPage: {
        title: {
          line1: 'Recycle Today for a',
          line2: 'Better Tomorrow'
        },
        description: 'Join our community-driven platform and make recycling simple, rewarding, and impactful',
        cta: {
          drop: 'Drop Your Waste!',
          learn: 'Learn More'
        },
        features: {
          voice: 'Record Your Items',
          schedule: 'Choose a Date and Time',
          earn: 'Get Paid or Donate',
          voiceInput: 'Voice Input',
          pickupScheduling: 'Pickup Scheduling',
          earnorshare: 'Earn or Share'
        },
        steps: {
          howItWorks: 'How It Works',
          step1: {
            title: 'Sign Up',
            desc: 'Create your account in just 30 seconds'
          },
          step2: {
            title: 'Select Type of Waste',
            desc: 'Choose from categories'
          },
          step3: {
            title: 'Connect & Recycle',
            desc: 'Find nearby centers or schedule pickup'
          }
        },
        marketplace: {
          title: 'Join Our Marketplace',
          subtitle: "Whether you're buying, crafting, or sourcing materials - we've got you covered",
          buyers: {
            title: 'For Buyers',
            description: 'Discover unique, eco-friendly products made from recycled materials by talented local artisans.',
            feature1: 'Quality recycled products',
            feature2: 'Support local artisans',
            feature3: 'Competitive prices'
          },
          crafters: {
            title: 'For Crafters',
            description: 'Turn your creative ideas into reality with our wide selection of recycled materials and resources.',
            feature1: 'Inspiration & tutorials',
            feature2: 'Access to materials',
            feature3: 'Sell your creations'
          },
          rawMaterials: {
            title: 'Raw Materials',
            description: 'Find the perfect recycled materials for your next project, from paper to metals and everything in between.',
            feature1: 'Wide variety of materials',
            feature2: 'Sorted & categorized',
            feature3: 'Bulk purchasing options'
          },
          cta: {
            title: 'Ready to Start Trading?',
            description: 'Join thousands of users already making a difference',
            button: 'Explore Marketplace'
          }
        },
        community: {
          title: 'Join Our',
          highlight: 'Karakeeb Community',
          desc1: 'Get exclusive recycling tips, sustainability insights, and special offers delivered straight to your inbox.',
          desc2: 'Join 10,000+ eco-warriors making a difference'
        },
        subscribe: {
          enter_email: 'Enter your email address',
          subscribe_now: 'Subscribe Now',
          invalid_email: 'Please enter a valid email.',
          success_message: 'Subscribed successfully! 🎉',
          error_message: 'Something went wrong.'
        }
      },
      auth: {
        login: {
          title: 'Welcome back',
          subtitle: 'Log in to continue',
          email: 'Email',
          password: 'Password',
          emailError: 'Invalid email format',
          emailrequired: 'Email is required',
          passwordrequired: 'password is required',
          passwordError: '8–20 characters, 1 uppercase, 1 number, 1 symbol',
          signIn: 'Sign in',
          signingIn: 'Signing in...',
          signUp: 'Sign Up',
          already: 'Already have an account? Sign in',
          sendReset: 'Send Reset Code',
          reset: 'Reset Password',
          resetSuccess: 'Password reset successfully',
          back: 'Back to previous',
          continueWith: 'Or Continue With',
          sendingReset: 'Sending...',
          forgotResetMsg: 'Enter your email to receive a reset code.',
          signingUp: 'Creating Account...',
          createAccount: 'Create Account',
          forgotPassword: 'Forgot your password?',
          securityNote: 'Don\'t worry, your information is 100% secure.',
          loginFailed: 'Login failed. Please check your credentials.',
          loginSuccess: 'welcome back !',
          dontHaveAccount: 'Don\'t have an account? Sign up',
          ChooseYourRole: 'Choose Your Role',
          typeOfAccount: 'Select the type of account you\'d like to create.',
          wait: 'please wait'
        },
        otp: {
          instruction: 'Enter the 6-digit code. You can paste the full code directly.',
          resend_question: 'Didn\'t receive the code?',
          resend_button: 'Resend OTP',
          confirm: 'Confirm',
          confirming: 'Confirming...',
          resend_success: 'Resend OTP Successfully',
          resend_failed: 'OTP Resend failed',
          submission_failed: 'OTP submission failed',
          submission_success: 'OTP sent! Check your email.',
          verified: 'Processing OTP Successfully',
          unVerified: 'Invalid Otp'
        },
        register: {
          fullName: 'Full Name',
          phoneNumber: 'Phone Number',
          confirmPassword: 'Confirm Password',
          next: 'Next',
          previous: 'Previous',
          success: 'Registered Successfully',
          fail: 'Registered Failed'
        },
        roles: {
          customer: {
            title: 'Customer Registration',
            description: 'Join our recycling community'
          },
          delivery: {
            title: 'Delivery Partner Registration',
            description: 'Become a verified delivery partner'
          },
          buyer: {
            title: 'Business Buyer Registration',
            description: 'Register your business to purchase recycled materials'
          }
        },
        errors: {
          required: {
            fullName: 'Full name is required',
            email: 'Email is required',
            phoneNumber: 'Phone number is required',
            password: 'Password is required',
            confirmPassword: 'Confirm password is required'
          },
          invalid: {
            email: 'Invalid email format',
            phoneNumber: 'Enter a valid Egyptian mobile or landline number'
          },
          password: {
            pattern: '8–20 characters, 1 uppercase, 1 number, 1 symbol',
            mismatch: 'Passwords do not match'
          },
          duplicateEmail: 'This email is already registered. Please use a different email or try logging in.'
        }
      },
      staticCategories: {
        recyclingCategories: 'Recycling Categories',
        recyclingCategoriesSubtitle: 'Having leftovers and want to earn money? Tell us what you have.',
        seeMore: 'See More',
        clickImageForDetails: 'For more detailed information on each category, click on the respective image.',
        discoverMoreSub: 'Discover more recyclable items in this category'
      },
      messages: {
        noCategories: 'No categories available'
      },
      common: {
        allCategories: 'All Categories',
        showing: 'Showing',
        of: 'of',
        items: 'items',
        page: 'Page',
        previous: 'Previous',
        next: 'Next',
        noItemsFound: 'No items found',
        tryDifferentSearch: 'Try different search terms or check spelling',
        noItemsAvailable: 'No items available yet',
        crossLanguageHint: 'Search works across Arabic and English languages',
        outOfStock: 'Out of Stock',
        inStock: 'In Stock',
        unitKg: 'per kg',
        cancel: 'Cancel',
        error: 'Error',
        loading: 'Loading...',
        FeaturedItems: 'Featured Items',
        viewAll: 'view all',
        unitPiece: 'per piece',
        invalidQuantity: 'Invalid quantity',
        wholeNumbersOnly: 'Whole numbers only',
        points: 'points',
        quantity: 'quantity',
        only: 'only',
        sold: 'sold',
        piece: 'piece',
        kg: 'kg',
        noMaterialsAvailable: 'No materials available yet',
        itemNotFound: 'Item Not Found',
        couldNotFindItem: 'We couldn\'t find this item',
        addToCart: 'Add to Cart',
        removeFromCart: 'Remove from Cart',
        mustLogin: 'You must be logged in to add items to the cart.',
        onlyBuyersCustomers: 'Only buyers and customers can add items to the cart.',
        goBack: 'Go Back',
        availableStock: 'Available Stock',
        workingOnAddingItems: 'We\'re working on adding more items. Check back soon!'
      },
      charts: {
        topRecycledMaterials: 'Top Recycled Materials',
        dashboardTitle: 'Admin Dashboard',
        totalOrders: 'Total Orders',
        activeUsers: 'Active Users',
        materialTrack: 'Material Track',
        orders: 'Orders',
        numberOfOrders: 'Number of Orders',
        dayOfWeek: 'Day of Week',
        loadingWeeklyData: 'Loading weekly data...',
        weeklyOrdersDistribution: 'Weekly Orders Distribution',
        thisWeek: 'This Week',
        lastWeek: 'Last Week',
        last4Weeks: 'Last 4 Weeks',
        last4WeeksAvg: 'Last 4 Weeks Average',
        currentDay: 'Current Day',
        index: 'Index',
        period: 'Period',
        total: 'Total',
        dailyAvg: 'Daily Avg',
        peakDay: 'Peak Day',
        vsPrevious: 'vs Previous',
        vsLastPeriod: 'vs Last Period',
        trends: {
          steady: 'Steady'
        },
        numbers: {
          percent: '%'
        }
      },
      sidebar: {
        dashboard: 'Dashboard',
        categories: 'Categories',
        users: 'Users',
        orders: 'Orders',
        transactions: 'Transactions',
        approve: 'Delivery Approvals',
        dark_mode: 'Dark Mode',
        logout: 'Logout'
      },
      slider: {
        badges: {
          communityChallenge: 'Community Challenge',
          limitedOffer: 'Limited Offer'
        },
        phoneRecycling: {
          title: 'Phone Recycling Program',
          description: 'Trade in your old phones and get amazing discounts on new devices',
          cta: 'Get Offer',
          learnMore: '/marketplace'
        },
        deviceChallenge: {
          title: 'Join Our 10K Device Challenge',
          description: 'We\'re aiming to responsibly recycle 10,000 devices this month - be part of the solution!',
          cta: 'Participate',
          learnMore: '/about/community-challenge'
        },
        fashionRecycling: {
          title: 'Fashion Recycling Program',
          description: 'Get 30% off when you bring in used clothing for recycling',
          cta: 'Get Offer',
          learnMore: '/profile/rewarding'
        },
        common: {
          learnMore: 'Learn More'
        },
        navigation: {
          previous: 'Previous',
          next: 'Next',
          goToSlide: 'Go to slide'
        }
      },
      recyclingBanner: {
        title: 'Transform Waste into',
        titleHighlight: 'Value',
        description: 'Join thousands of eco-conscious individuals making a difference',
        stats: {
          dailyRecyclers: 'Daily Recyclers',
          itemsRecycled: 'Items Recycled',
          co2Reduced: 'CO2 Reduced',
          ecoFriendly: 'Eco-Friendly'
        }
      },
      buyerDashboard: {
        welcome: 'Welcome to Your Dashboard',
        subtitle: 'Browse and purchase items from our marketplace',
        browseCategories: 'Browse Categories',
        viewAllItems: 'View All Items',
        marketplaceItems: 'Marketplace Items',
        findItems: 'Find and purchase items you need'
      },
      cart: {
        myCart: 'My Cart',
        myCollection: 'My Collection',
        emptyCart: 'Your cart is empty',
        addItemsToStart: 'Add items to your cart to get started',
        browseMarketplace: 'Browse Marketplace',
        totalItems: 'Total Items',
        totalPrice: 'Total Price',
        proceedToCheckout: 'Proceed to Checkout',
        loginToCheckout: 'Please login to proceed to checkout',
        clearAll: 'Clear All',
        clearConfirm: 'Are you sure you want to clear your cart?',
        remove: 'Remove',
        removeConfirm: 'Are you sure you want to remove this item from your cart?',
        removedFromCart: 'has been removed from your cart',
        itemRemoved: 'Item Removed',
        removeError: 'Failed to remove item from cart',
        cartCleared: 'Your cart has been cleared',
        success: 'Success',
        clearError: 'Failed to clear cart',
        onlyBuyersCustomers: 'Only buyers and customers can checkout.',
        checkoutComingSoon: 'Checkout functionality coming soon!'
      },
      profile: {
        returnEarn: 'Return & Earn',
        editProfile: 'Edit Profile',
        stats: {
          recycles: 'Total Recycles',
          points: 'Points Collected',
          orders: 'Total Orders'
        },
        delivery: {
          customer_reviews: 'Customer Reviews',
          total_reviews: 'Total reviews',
          no_comment: 'No comment provided',
          verified_courier: 'Verified Courier',
          deliveries: 'Deliveries',
          edit_profile: 'Edit Profile'
        },
        noActivity: 'No Activity Yet.',
        noOrders: 'No Orders In This Tab Yet.',
        noReveiws: 'No Reveiws Yet.',
        noReveiwsSub: 'Complete an order and rate it to see your reviews here',
        tires: {
          ecobeginner: 'Eco Beginner',
          ecostarter: 'Eco Starter',
          greenhelper: 'Green Helper',
          silverrecycler: 'Silver Recycler',
          goldguardian: 'Gold Guardian',
          platinumpioneer: 'Platinum Pioneer',
          diamondelite: 'Diamond Elite'
        },
        method: {
          card: 'Visa',
          link: 'Visa',
          paypal: 'PayPal',
          cash: 'Cash',
          unknown: 'Unknown'
        },
        tabs: {
          incoming: 'Incoming',
          completed: 'Completed',
          cancelled: 'Cancelled',
          payments: 'Payment',
          reviews: 'Reviews'
        },
        orders: {
          loading: ' orders...',
          empty: 'No orders in this tab yet.',
          date: 'Date',
          status: {
            inTransit: 'In Transit',
            completed: 'Completed',
            cancelled: 'Cancelled',
            pending: 'Pending',
            collected: 'Collected'
          },
          cancelOrder: 'cancel order',
          viewDetails: 'View Details',
          track: 'Track Order',
          rate: 'Rate your order',
          editRate: 'Edit Review',
          recipt: 'View Recipt',
          cancelConfirm: 'Are you sure you want to cancel this order?',
          confirmYes: 'Yes',
          confirmNo: 'No',
          cancelled: 'Order cancelled',
          failed: 'Failed to cancel order',
          safe: 'Your order is safe'
        },
        location: 'Cairo, July 2025'
      },
      notifications: {
        noNotifications: 'No notifications',
        noNotificationsDesc: 'You\'re all caught up!',
        markAllRead: 'Mark all as read',
        marking: 'Marking...',
        loadMore: 'Load More',
        loading: 'Loading...',
        viewAll: 'View All'
      },
      editProfile: {
        title: 'Edit Profile',
        avatarAlt: 'Profile picture',
        form: {
          fullName: 'Full Name',
          phoneNumber: 'Phone Number',
          phonePlaceholder: '10XXXXXXXXX'
        },
        validation: {
          nameRequired: 'Name is required',
          nameMaxLength: 'Name must be less than 20 characters',
          phoneRequired: 'Phone number is required',
          phoneInvalid: 'Invalid phone number format',
          imageFormat: 'Invalid image format. Please use JPEG, PNG, or WebP.',
          imageSize: 'Image size must be less than 2MB.'
        },
        buttons: {
          cancel: 'Cancel',
          save: 'Save',
          saving: 'Saving...'
        },
        messages: {
          updateSuccess: 'Profile updated successfully',
          updateError: 'Failed to update profile'
        }
      },
      itemsModal: {
        currency: 'EGP',
        perKg: 'per kg',
        perItem: 'per item',
        points: 'points'
      }
    },
    // ar: {
    //   navbar: {
    //     title: 'كراكيب',
    //     home: 'الرئيسية',
    //     marketplace: 'تسوق المنتجات',
    //     categories: 'الأقسام',
    //     ecoAssist: 'المساعد البيئي',
    //     myCollection: 'مجموعتي',
    //     myCart: 'عربة التسوق',
    //     profile: 'صفحتي',
    //     settings: 'الإعدادات',
    //     signOut: 'تسجيل الخروج',
    //     login: 'تسجيل الدخول',
    //     startRecycling: 'ابدأ التدوير',
    //     logout: 'تسجيل خروج',
    //     language: 'اللغة',
    //     darkMode: 'الوضع الليلي',
    //     lightMode: 'الوضع النهاري',
    //     ewallet: 'محفظتي',
    //     items: 'عناصر',
    //     viewFullCollection: 'عرض المجموع الكامل',
    //     yourCollectionEmpty: 'مجموعتك فارغة'
    //   },
    //   footer: {
    //     title: 'كراكيب',
    //     slogan: 'أعد التدوير بذكاء، وعيش بنظافة.',
    //     quickLinks: 'روابط سريعة',
    //     FAQ: 'الاسئلة الأكثر شيوعا',
    //     about: 'من نحن',
    //     cart: 'السلة',
    //     contact: 'تواصل معنا',
    //     rewarding: 'مكافآت إعادة التدوير',
    //     rights: 'جميع الحقوق محفوظة.',
    //     ContactUs: 'تحدث معنا',
    //     'Eco-Friendly Platform': 'تطبيق مساعد للحفاظ على البيئة',
    //     support: 'مساعدة'
    //   },
    //   indexPage: {
    //     title: {
    //       line1: 'إعادة التدوير اليوم من أجل',
    //       line2: 'غدٍ أفضل'
    //     },
    //     description: 'انضم إلى منصتنا المجتمعية واجعل إعادة التدوير تجربة بسيطة، مجزية، وفعّالة.',
    //     cta: {
    //       drop: 'سلّم نفاياتك الآن!',
    //       learn: 'اكتشف المزيد'
    //     },
    //     features: {
    //       voice: 'سجّل نفاياتك بالصوت',
    //       schedule: 'حدّد التاريخ والوقت',
    //       earn: 'اكسب أو تبرّع بها',
    //       voiceInput: 'تسجيل صوتي',
    //       pickupScheduling: 'جدولة الاستلام',
    //       earnorshare: 'اكسب أو شارك'
    //     },
    //     steps: {
    //       howItWorks: 'كيف يعمل',
    //       step1: {
    //         title: 'سجّل',
    //         desc: 'أنشئ حسابك في 30 ثانية فقط'
    //       },
    //       step2: {
    //         title: 'اختر نوع النفايات',
    //         desc: 'اختر من الأقسام'
    //       },
    //       step3: {
    //         title: 'تواصل وأعد التدوير',
    //         desc: 'اعثر على المراكز القريبة أو حدد موعد الاستلام'
    //       }
    //     },
    //     marketplace: {
    //       title: 'انضم إلى السوق الخاص بنا',
    //       subtitle: 'سواء كنت تشتري أو تصنع أو تبحث عن مواد - نحن نوفر لك ما تحتاج',
    //       buyers: {
    //         title: 'للمشترين',
    //         description: 'اكتشف منتجات فريدة وصديقة للبيئة مصنوعة من مواد معاد تدويرها بواسطة حرفيين محليين موهوبين.',
    //         feature1: 'منتجات معاد تدويرها عالية الجودة',
    //         feature2: 'دعم الحرفيين المحليين',
    //         feature3: 'أسعار تنافسية'
    //       },
    //       crafters: {
    //         title: 'للحرفيين',
    //         description: 'حوّل أفكارك الإبداعية إلى حقيقة مع مجموعتنا الواسعة من المواد المعاد تدويرها والموارد.',
    //         feature1: 'إلهام ودروس تعليمية',
    //         feature2: 'الوصول إلى المواد',
    //         feature3: 'بيع إبداعاتك'
    //       },
    //       rawMaterials: {
    //         title: 'المواد الخام',
    //         description: 'اعثر على المواد المعاد تدويرها المثالية لمشروعك القادم، من الورق إلى المعادن وكل شيء بينهما.',
    //         feature1: 'مجموعة واسعة من المواد',
    //         feature2: 'مرتبة ومصنفة',
    //         feature3: 'خيارات شراء بالجملة'
    //       },
    //       cta: {
    //         title: 'مستعد لبدء التداول؟',
    //         description: 'انضم إلى آلاف المستخدمين الذين يحدثون فرقًا بالفعل',
    //         button: 'استكشف السوق'
    //       }
    //     },
    //     community: {
    //       title: 'انضم إلى',
    //       highlight: 'مجتمع كراكيب',
    //       desc1: 'احصل على نصائح حصرية لإعادة التدوير ورؤى الاستدامة وعروض خاصة تُرسل مباشرة إلى بريدك الإلكتروني.',
    //       desc2: 'انضم إلى أكثر من 10,000 محارب بيئي يحدثون فرقًا'
    //     },
    //     subscribe: {
    //       enter_email: 'أدخل عنوان بريدك الإلكتروني',
    //       subscribe_now: 'اشترك الآن',
    //       invalid_email: 'يرجى إدخال بريد إلكتروني صحيح.',
    //       success_message: 'تم الاشتراك بنجاح! 🎉',
    //       error_message: 'حدث خطأ ما.'
    //     }
    //   },
    //   itemsModal: {
    //     currency: 'EGP',
    //     perKg: 'per kg',
    //     perItem: 'per item',
    //     points: 'points'
    //   },
    //   common: {
    //     allCategories: 'All Categories',
    //     showing: 'Showing',
    //     of: 'of',
    //     items: 'items',
    //     page: 'Page',
    //     noItemsFound: 'No items found',
    //     tryDifferentSearch: 'Try different search terms or check spelling',
    //     noItemsAvailable: 'No items available yet',
    //     crossLanguageHint: 'Search works across Arabic and English languages',
    //     outOfStock: 'Out of Stock',
    //     inStock: 'In Stock',
    //     unitKg: 'per kg',
    //     unitPiece: 'per piece',
    //     invalidQuantity: 'Invalid quantity',
    //     wholeNumbersOnly: 'Whole numbers only',
    //     points: 'points',
    //     quantity: 'quantity',
    //     only: 'only',
    //     itemNotFound: 'Item Not Found',
    //     couldNotFindItem: 'We couldn\'t find this item',
    //     goBack: 'Go Back',
    //     loading: 'Loading...',
    //     addToCart: 'Add to Cart',
    //     removeFromCart: 'Remove from Cart',
    //     availableStock: 'Available Stock'
    //   }
    // },
    ar: {
      navbar: {
        title: 'كراكيب',
        home: 'الرئيسية',
        marketplace: 'تسوق المنتجات',
        categories: 'الأقسام',
        ecoAssist: 'المساعد البيئي',
        myCollection: 'مجموعتي',
        myCart: 'عربة التسوق',
        profile: 'صفحتي',
        settings: 'الإعدادات',
        signOut: 'تسجيل الخروج',
        login: 'تسجيل الدخول',
        startRecycling: 'ابدأ التدوير',
        logout: 'تسجيل خروج',
        language: 'اللغة',
        darkMode: 'الوضع الليلي',
        lightMode: 'الوضع النهاري',
        ewallet: 'محفظتي',
        items: 'عناصر',
        viewFullCollection: 'عرض المجموع الكامل',
        yourCollectionEmpty: 'مجموعتك فارغة',
        addItemsToStart: 'أضف عناصر قابلة لإعادة التدوير للبدء',
        totalItems: 'إجمالي العناصر:',
        searchplaceholder: 'ابحث عن شيء...'
      },
      footer: {
        title: 'كراكيب',
        slogan: 'أعد التدوير بذكاء، وعيش بنظافة.',
        quickLinks: 'روابط سريعة',
        FAQ: 'الاسئلة الأكثر شيوعا',
        about: 'من نحن',
        cart: 'السلة',
        contact: 'تواصل معنا',
        rewarding: 'مكافآت إعادة التدوير',
        rights: 'جميع الحقوق محفوظة.',
        ContactUs: 'تحدث معنا',
        'Eco-Friendly Platform': 'تطبيق مساعد للحفاظ على البيئة',
        support: 'مساعدة'
      },
      indexPage: {
        title: {
          line1: 'إعادة التدوير اليوم من أجل',
          line2: 'غدٍ أفضل'
        },
        description: 'انضم إلى منصتنا المجتمعية واجعل إعادة التدوير تجربة بسيطة، مجزية، وفعّالة.',
        cta: {
          drop: 'سلّم نفاياتك الآن!',
          learn: 'اكتشف المزيد'
        },
        features: {
          voice: 'سجّل نفاياتك بالصوت',
          schedule: 'حدّد التاريخ والوقت',
          earn: 'اكسب أو تبرّع بها',
          voiceInput: 'تسجيل صوتي',
          pickupScheduling: 'جدولة الاستلام',
          earnorshare: 'اكسب أو شارك'
        },
        steps: {
          howItWorks: 'كيف يعمل',
          step1: {
            title: 'سجّل',
            desc: 'أنشئ حسابك في 30 ثانية فقط'
          },
          step2: {
            title: 'اختر نوع النفايات',
            desc: 'اختر من الأقسام'
          },
          step3: {
            title: 'تواصل وأعد التدوير',
            desc: 'اعثر على المراكز القريبة أو حدد موعد الاستلام'
          }
        },
        marketplace: {
          title: 'انضم إلى السوق الخاص بنا',
          subtitle: 'سواء كنت تشتري أو تصنع أو تبحث عن مواد - نحن نوفر لك ما تحتاج',
          buyers: {
            title: 'للمشترين',
            description: 'اكتشف منتجات فريدة وصديقة للبيئة مصنوعة من مواد معاد تدويرها بواسطة حرفيين محليين موهوبين.',
            feature1: 'منتجات معاد تدويرها عالية الجودة',
            feature2: 'دعم الحرفيين المحليين',
            feature3: 'أسعار تنافسية'
          },
          crafters: {
            title: 'للحرفيين',
            description: 'حول أفكارك الإبداعية إلى واقع مع مجموعتنا الواسعة من المواد المعاد تدويرها والموارد.',
            feature1: 'إلهام ودروس',
            feature2: 'الوصول إلى المواد',
            feature3: 'بيع إبداعاتك'
          },
          rawMaterials: {
            title: 'المواد الخام',
            description: 'ابحث عن المواد المعاد تدويرها المثالية لمشروعك القادم، من الورق إلى المعادن وكل ما بينهما.',
            feature1: 'مجموعة واسعة من المواد',
            feature2: 'مصنفة ومنظمة',
            feature3: 'خيارات الشراء بالجملة'
          },
          cta: {
            title: 'جاهز للبدء في التداول؟',
            description: 'انضم إلى آلاف المستخدمين الذين يحدثون فرقًا بالفعل',
            button: 'استكشف السوق'
          }
        },
        community: {
          title: 'انضم إلى',
          highlight: 'مجتمع كراكيب',
          desc1: 'احصل على نصائح إعادة التدوير الحصرية ورؤى الاستدامة والعروض الخاصة مباشرة في بريدك الوارد.',
          desc2: 'انضم إلى أكثر من 10,000 محارب بيئي يحدثون فرقًا'
        },
        subscribe: {
          enter_email: 'أدخل عنوان بريدك الإلكتروني',
          subscribe_now: 'اشترك الآن',
          invalid_email: 'يرجى إدخال بريد إلكتروني صالح.',
          success_message: 'تم الاشتراك بنجاح! 🎉',
          error_message: 'حدث خطأ ما.'
        }
      },
      itemsModal: {
        currency: 'ج.م',
        perKg: 'لكل كيلو',
        perItem: 'لكل قطعة',
        points: 'نقاط'
      },
      common: {
        allCategories: 'جميع الفئات',
        showing: 'عرض',
        of: 'من',
        items: 'عناصر',
        page: 'صفحة',
        previous: 'السابق',
        next: 'التالي',
        noItemsFound: 'لم يتم العثور على عناصر',
        tryDifferentSearch: 'جرب مصطلحات بحث مختلفة أو تحقق من الإملاء',
        noItemsAvailable: 'لا توجد عناصر متاحة بعد',
        crossLanguageHint: 'البحث يعمل عبر اللغتين العربية والإنجليزية',
        outOfStock: 'نفدت الكمية',
        inStock: 'متوفر',
        unitKg: 'لكل كيلو',
        cancel: 'إلغاء',
        error: 'خطأ',
        loading: 'جاري التحميل...',
        FeaturedItems: 'العناصر المميزة',
        viewAll: 'عرض الكل',
        unitPiece: 'لكل قطعة',
        invalidQuantity: 'كمية غير صالحة',
        wholeNumbersOnly: 'أرقام صحيحة فقط',
        points: 'نقاط',
        quantity: 'الكمية',
        only: 'فقط',
        sold: 'مباع',
        piece: 'قطعة',
        kg: 'كيلو',
        noMaterialsAvailable: 'لا توجد مواد متاحة بعد',
        itemNotFound: 'العنصر غير موجود',
        couldNotFindItem: 'لم نتمكن من العثور على هذا العنصر',
        addToCart: 'أضف إلى السلة',
        removeFromCart: 'إزالة من السلة',
        mustLogin: 'يجب عليك تسجيل الدخول لإضافة العناصر إلى السلة.',
        onlyBuyersCustomers: 'يمكن للمشترين والعملاء فقط إضافة العناصر إلى السلة.',
        goBack: 'العودة',
        availableStock: 'المخزون المتاح',
        workingOnAddingItems: 'نعمل على إضافة المزيد من العناصر. تحقق مرة أخرى قريبًا!'
      },
        charts: {
          topRecycledMaterials: 'أكثر المواد المعاد تدويرها',
          dashboardTitle: 'لوحة تحكم المدير',
          totalOrders: 'إجمالي الطلبات',
          activeUsers: 'المستخدمون النشطون',
          materialTrack: 'تتبع المواد',
          userGrowth: 'نمو المستخدمين',
          orderStatus: 'حالة الطلب',
          topRecyclers: 'أفضل المعيدين للتدوير',
          topCities: 'أفضل المدن',
          weeklyOrdersDistribution: 'توزيع الطلبات الأسبوعي',
          vsLastPeriod: 'مقارنة بالفترة السابقة',
          trends: {
            steady: 'ثابت'
          }
        },
        sidebar: {
          dashboard: 'لوحة التحكم',
          categories: 'الفئات',
          users: 'المستخدمون',
          orders: 'الطلبات',
          transactions: 'المعاملات',
          approve: 'موافقات التوصيل',
          dark_mode: 'الوضع الليلي',
          logout: 'تسجيل الخروج'
        },
      slider: {
        badges: {
          communityChallenge: 'تحدي المجتمع',
          limitedOffer: 'عرض محدود'
        },
        phoneRecycling: {
          title: 'برنامج إعادة تدوير الهواتف',
          description: 'استبدل هواتفك القديمة واحصل على خصومات مذهلة على الأجهزة الجديدة',
          cta: 'احصل على العرض',
          learnMore: '/marketplace'
        },
        deviceChallenge: {
          title: 'انضم إلى تحدي 10 آلاف جهاز',
          description: 'نهدف إلى إعادة تدوير 10,000 جهاز بشكل مسؤول هذا الشهر - كن جزءًا من الحل!',
          cta: 'شارك',
          learnMore: '/about/community-challenge'
        },
        fashionRecycling: {
          title: 'برنامج إعادة تدوير الأزياء',
          description: 'احصل على خصم 30% عند إحضار الملابس المستعملة لإعادة التدوير',
          cta: 'احصل على العرض',
          learnMore: '/profile/rewarding'
        },
        common: {
          learnMore: 'اعرف المزيد'
        },
        navigation: {
          previous: 'السابق',
          next: 'التالي',
          goToSlide: 'انتقل إلى الشريحة'
        }
      },
      recyclingBanner: {
        title: 'حول النفايات إلى',
        titleHighlight: 'قيمة',
        description: 'انضم إلى آلاف الأفراد الواعيين بيئياً الذين يحدثون فرقاً',
        stats: {
          dailyRecyclers: 'مُعيد تدوير يومي',
          itemsRecycled: 'عنصر معاد تدويره',
          co2Reduced: 'ثاني أكسيد الكربون مخفض',
          ecoFriendly: 'صديق للبيئة'
        }
      },
      buyerDashboard: {
        welcome: 'مرحباً بك في لوحة التحكم',
        subtitle: 'تصفح واشتري العناصر من سوقنا',
        browseCategories: 'تصفح الفئات',
        viewAllItems: 'عرض جميع العناصر',
        marketplaceItems: 'عناصر السوق',
        findItems: 'ابحث واشتري العناصر التي تحتاجها'
      },
      cart: {
        myCart: 'سلة التسوق',
        myCollection: 'مجموعتي',
        emptyCart: 'سلة التسوق فارغة',
        addItemsToStart: 'أضف العناصر إلى سلة التسوق للبدء',
        browseMarketplace: 'تصفح السوق',
        totalItems: 'إجمالي العناصر',
        totalPrice: 'السعر الإجمالي',
        proceedToCheckout: 'المتابعة إلى الدفع',
        loginToCheckout: 'يرجى تسجيل الدخول للمتابعة إلى الدفع',
        clearAll: 'مسح الكل',
        clearConfirm: 'هل أنت متأكد أنك تريد مسح سلة التسوق؟',
        remove: 'إزالة',
        removeConfirm: 'هل أنت متأكد أنك تريد إزالة هذا العنصر من سلة التسوق؟',
        removedFromCart: 'تمت إزالته من سلة التسوق',
        itemRemoved: 'تمت إزالة العنصر',
        removeError: 'فشلت إزالة العنصر من سلة التسوق',
        cartCleared: 'تم مسح سلة التسوق',
        success: 'نجح',
        clearError: 'فشل مسح سلة التسوق',
        onlyBuyersCustomers: 'يمكن للمشترين والعملاء فقط إتمام الدفع.',
        checkoutComingSoon: 'وظيفة الدفع قريباً!'
      },
      profile: {
        returnEarn: 'إرجاع وكسب',
        editProfile: 'تعديل الملف الشخصي',
        stats: {
          recycles: 'إجمالي إعادة التدوير',
          points: 'النقاط المجمعة',
          orders: 'إجمالي الطلبات'
        },
        delivery: {
          customer_reviews: 'تقييمات العملاء',
          total_reviews: 'إجمالي التقييمات',
          no_comment: 'لا يوجد تعليق',
          verified_courier: 'ساعي معتمد',
          deliveries: 'التوصيلات',
          edit_profile: 'تعديل الملف الشخصي'
        },
        noActivity: 'لا يوجد نشاط حتى الآن.',
        noOrders: 'لا توجد طلبات في هذا التبويب بعد.',
        noReveiws: 'لا توجد تقييمات حتى الآن.',
        noReveiwsSub: 'أكمل طلبًا وقيمه لرؤية تقييماتك هنا',
        tires: {
          ecobeginner: 'مبتدئ بيئي',
          ecostarter: 'مبتدئ بيئي',
          greenhelper: 'مساعد أخضر',
          silverrecycler: 'معيد تدوير فضي',
          goldguardian: 'حارس ذهبي',
          platinumpioneer: 'رائد بلاتيني',
          diamondelite: 'نخبة الماس'
        },
        method: {
          card: 'فيزا',
          link: 'فيزا',
          paypal: 'باي بال',
          cash: 'نقد',
          unknown: 'غير معروف'
        },
        tabs: {
          incoming: 'قادمة',
          completed: 'مكتملة',
          cancelled: 'ملغاة',
          payments: 'الدفع',
          reviews: 'التقييمات'
        },
        orders: {
          loading: ' طلبات...',
          empty: 'لا توجد طلبات في هذا التبويب بعد.',
          date: 'التاريخ',
          status: {
            inTransit: 'قيد النقل',
            completed: 'مكتمل',
            cancelled: 'ملغي',
            pending: 'قيد الانتظار',
            collected: 'تم الجمع'
          },
          cancelOrder: 'إلغاء الطلب',
          viewDetails: 'عرض التفاصيل',
          track: 'تتبع الطلب',
          rate: 'قيم طلبك',
          editRate: 'تعديل التقييم',
          recipt: 'عرض الإيصال',
          cancelConfirm: 'هل أنت متأكد أنك تريد إلغاء هذا الطلب؟',
          confirmYes: 'نعم',
          confirmNo: 'لا',
          cancelled: 'تم إلغاء الطلب',
          failed: 'فشل إلغاء الطلب',
          safe: 'طلبك آمن'
        },
        location: 'القاهرة، يوليو 2025'
      },
      notifications: {
        noNotifications: 'لا توجد إشعارات',
        noNotificationsDesc: 'أنت محدث بكل شيء!',
        markAllRead: 'تحديد الكل كمقروء',
        marking: 'جاري التحديد...',
        loadMore: 'تحميل المزيد',
        loading: 'جاري التحميل...',
        viewAll: 'عرض الكل'
      },
      editProfile: {
        title: 'تعديل الملف الشخصي',
        avatarAlt: 'صورة الملف الشخصي',
        form: {
          fullName: 'الاسم الكامل',
          phoneNumber: 'رقم الهاتف',
          phonePlaceholder: '10XXXXXXXXX'
        },
        validation: {
          nameRequired: 'الاسم مطلوب',
          nameMaxLength: 'يجب أن يكون الاسم أقل من 20 حرفًا',
          phoneRequired: 'رقم الهاتف مطلوب',
          phoneInvalid: 'تنسيق رقم الهاتف غير صحيح',
          imageFormat: 'تنسيق الصورة غير صحيح. يرجى استخدام JPEG أو PNG أو WebP.',
          imageSize: 'يجب أن يكون حجم الصورة أقل من 2 ميجابايت.'
        },
        buttons: {
          cancel: 'إلغاء',
          save: 'حفظ',
          saving: 'جاري الحفظ...'
        },
        messages: {
          updateSuccess: 'تم تحديث الملف الشخصي بنجاح',
          updateError: 'فشل تحديث الملف الشخصي'
        }
      },
      staticCategories: {
        recyclingCategories: 'فئات إعادة التدوير',
        recyclingCategoriesSubtitle: 'لديك بقايا وتريد كسب المال؟ أخبرنا بما لديك.',
        seeMore: 'عرض المزيد',
        clickImageForDetails: 'لمزيد من المعلومات التفصيلية حول كل فئة، انقر على الصورة المقابلة.',
        discoverMoreSub: 'اكتشف المزيد من العناصر القابلة لإعادة التدوير في هذه الفئة'
      },
      messages: {
        noCategories: 'لا توجد فئات متاحة'
      }
    }
  };

  private currentLocale = signal<string>('en');

  constructor() {
    // Load locale from localStorage or default to 'en'
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('locale') || 'en';
      this.currentLocale.set(savedLocale);
      document.documentElement.dir = savedLocale === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = savedLocale;
    }
  }

  setLocale(locale: string): void {
    this.currentLocale.set(locale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', locale);
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
    }
  }

  getLocale(): string {
    return this.currentLocale();
  }

  translate(key: string): string {
    const keys = key.split('.');
    let value: any = this.translations[this.currentLocale()];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    return typeof value === 'string' ? value : key;
  }

  t(key: string): string {
    return this.translate(key);
  }

  convertNumber(value: number | string, loc?: string): string {
    const locale = loc || this.currentLocale();
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) return value.toString();
    
    // Format with decimals if needed (e.g., 112398.5)
    const formatted = numValue % 1 === 0 
      ? numValue.toString() 
      : numValue.toFixed(1);
    
    if (locale === 'ar') {
      // Convert to Arabic-Indic numerals
      const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      return formatted.replace(/\d/g, (digit) => {
        if (digit === '.') return '٫'; // Arabic decimal separator
        return arabicNumerals[parseInt(digit)];
      });
    }
    
    return formatted;
  }
}

