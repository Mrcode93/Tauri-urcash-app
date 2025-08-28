const arabicMessages = {
  // General messages
  success: {
    product_created: 'تم إضافة المنتج بنجاح',
    product_updated: 'تم تحديث المنتج بنجاح',
    product_deleted: 'تم حذف المنتج بنجاح',
    product_deleted_force: 'تم حذف المنتج وجميع السجلات المرتبطة به بنجاح',
    stock_adjusted: 'تم تعديل المخزون بنجاح',
    products_fetched: 'تم جلب المنتجات بنجاح',
    product_fetched: 'تم جلب المنتج بنجاح',
    products_imported: 'تم استيراد المنتجات بنجاح',
    products_exported: 'تم تصدير المنتجات بنجاح',
    movement_logged: 'تم تسجيل حركة المخزون بنجاح',
    // Category success messages
    category_created: 'تم إضافة الفئة بنجاح',
    category_updated: 'تم تحديث الفئة بنجاح',
    category_deleted: 'تم حذف الفئة بنجاح',
    categories_fetched: 'تم جلب قائمة الفئات بنجاح',
    category_fetched: 'تم جلب الفئة بنجاح'
  },

  // Error messages
  error: {
    // Validation errors
    validation_error: 'خطأ في التحقق من البيانات',
    required_field: 'هذا الحقل مطلوب',
    invalid_format: 'تنسيق غير صحيح',
    invalid_number: 'يجب أن يكون رقماً صحيحاً',
    invalid_price: 'يجب أن يكون السعر أكبر من صفر',
    invalid_quantity: 'يجب أن تكون الكمية أكبر من صفر',
    invalid_barcode: 'يجب أن يكون الباركود 8 أرقام على الأقل',
    invalid_sku: 'رمز المنتج غير صحيح',
    invalid_expiry_date: 'تاريخ انتهاء الصلاحية غير صحيح',
    invalid_stock: 'الكمية المتوفرة غير كافية',
    invalid_min_stock: 'الحد الأدنى للمخزون يجب أن يكون صفر أو أكثر',

    // Database errors
    product_not_found: 'المنتج غير موجود',
    product_already_exists: 'المنتج موجود مسبقاً',
    sku_already_exists: 'رمز المنتج موجود مسبقاً',
    barcode_already_exists: 'الباركود موجود مسبقاً',
    database_error: 'خطأ في قاعدة البيانات',
    connection_error: 'خطأ في الاتصال بقاعدة البيانات',

    // Business logic errors
    insufficient_stock: 'المخزون المتوفر غير كافي',
    product_in_use: 'لا يمكن حذف المنتج لأنه مستخدم في عمليات أخرى',
    product_has_references: 'لا يمكن حذف المنتج لأنه مرتبط بسجلات أخرى',
    cannot_delete_with_sales: 'لا يمكن حذف المنتج لأنه مرتبط بمبيعات',
    cannot_delete_with_purchases: 'لا يمكن حذف المنتج لأنه مرتبط بمشتريات',
    cannot_delete_with_bills: 'لا يمكن حذف المنتج لأنه مرتبط بفواتير',
    cannot_delete_with_returns: 'لا يمكن حذف المنتج لأنه مرتبط بمرتجعات',
    cannot_delete_with_suppliers: 'لا يمكن حذف المنتج لأنه مرتبط بموردين',

    // Category error messages
    category_not_found: 'الفئة غير موجودة',
    category_already_exists: 'الفئة موجودة مسبقاً',
    category_in_use: 'لا يمكن حذف الفئة لأنها مستخدمة في منتجات',
    category_has_products: 'لا يمكن حذف الفئة لأنها تحتوي على منتجات',
    category_name_required: 'اسم الفئة مطلوب',
    category_name_too_short: 'اسم الفئة قصير جداً',
    category_name_too_long: 'اسم الفئة طويل جداً',
    category_name_invalid: 'اسم الفئة غير صحيح',
    category_fetch_failed: 'فشل في جلب قائمة الفئات',
    category_create_failed: 'فشل في إنشاء الفئة',
    category_update_failed: 'فشل في تحديث الفئة',
    category_delete_failed: 'فشل في حذف الفئة',

    // File operations
    file_upload_error: 'خطأ في رفع الملف',
    file_not_found: 'الملف غير موجود',
    invalid_file_format: 'تنسيق الملف غير صحيح',
    file_too_large: 'حجم الملف كبير جداً',
    csv_parse_error: 'خطأ في قراءة ملف CSV',
    export_error: 'خطأ في تصدير البيانات',

    // Network errors
    network_error: 'خطأ في الاتصال بالخادم',
    timeout_error: 'انتهت مهلة الاتصال',
    server_error: 'خطأ في الخادم',
    service_unavailable: 'الخدمة غير متوفرة',

    // Permission errors
    unauthorized: 'غير مصرح لك بالوصول',
    forbidden: 'غير مسموح لك بهذا الإجراء',
    insufficient_permissions: 'صلاحيات غير كافية',

    // Generic errors
    unknown_error: 'حدث خطأ غير متوقع',
    operation_failed: 'فشلت العملية',
    try_again: 'يرجى المحاولة مرة أخرى',
    contact_support: 'يرجى التواصل مع الدعم الفني'
  },

  // Warning messages
  warning: {
    low_stock: 'المخزون منخفض',
    expiring_soon: 'المنتج سينتهي قريباً',
    negative_stock: 'المخزون سالب',
    duplicate_barcode: 'الباركود مكرر',
    duplicate_sku: 'رمز المنتج مكرر',
    // Category warning messages
    category_has_products: 'تحتوي الفئة على منتجات',
    category_name_similar: 'اسم الفئة مشابه لفئة موجودة',
    category_empty: 'الفئة فارغة'
  },

  // Info messages
  info: {
    product_created_with_barcode: 'تم إنشاء منتج جديد بالباركود الممسوح',
    barcode_not_found: 'لم يتم العثور على منتج بهذا الباركود',
    stock_adjusted: 'تم تعديل المخزون',
    import_in_progress: 'جاري استيراد المنتجات...',
    export_in_progress: 'جاري تصدير المنتجات...',
    processing_request: 'جاري معالجة الطلب...',
    // Category info messages
    category_processing: 'جاري معالجة الفئة...',
    category_imported: 'تم استيراد الفئات بنجاح',
    category_exported: 'تم تصدير الفئات بنجاح'
  },

  // Field-specific messages
  fields: {
    name: {
      required: 'اسم المنتج مطلوب',
      too_short: 'اسم المنتج قصير جداً',
      too_long: 'اسم المنتج طويل جداً'
    },
    sku: {
      required: 'رمز المنتج مطلوب',
      invalid: 'رمز المنتج غير صحيح',
      duplicate: 'رمز المنتج موجود مسبقاً'
    },
    barcode: {
      invalid: 'الباركود غير صحيح',
      duplicate: 'الباركود موجود مسبقاً',
      too_short: 'الباركود قصير جداً'
    },
    price: {
      required: 'السعر مطلوب',
      invalid: 'السعر غير صحيح',
      negative: 'السعر لا يمكن أن يكون سالباً'
    },
    stock: {
      invalid: 'الكمية غير صحيحة',
      negative: 'الكمية لا يمكن أن تكون سالبة',
      insufficient: 'الكمية المتوفرة غير كافية'
    },
    expiry_date: {
      invalid: 'تاريخ انتهاء الصلاحية غير صحيح',
      past: 'تاريخ انتهاء الصلاحية لا يمكن أن يكون في الماضي'
    },
    // Category field messages
    category_id: {
      required: 'الفئة مطلوبة',
      invalid: 'الفئة غير صحيحة',
      duplicate: 'اسم الفئة موجود مسبقاً'
    },
    category_name: {
      required: 'اسم الفئة مطلوب',
      too_short: 'اسم الفئة قصير جداً (يجب أن يكون 2 أحرف على الأقل)',
      too_long: 'اسم الفئة طويل جداً (يجب أن يكون 50 حرف أو أقل)',
      invalid: 'اسم الفئة غير صحيح',
      duplicate: 'اسم الفئة موجود مسبقاً'
    }
  },

  // Reference types for error messages
  references: {
    sales: 'مبيعات',
    purchases: 'مشتريات',
    movements: 'حركات مخزون',
    debts: 'ديون',
    products: 'منتجات'
  }
};

// Sales Messages
const salesMessages = {
  // Success Messages
  sale_created: 'تم إنشاء المبيعة بنجاح',
  sale_updated: 'تم تحديث المبيعة بنجاح',
  sale_deleted: 'تم حذف المبيعة بنجاح',
  sale_fetched: 'تم جلب المبيعة بنجاح',
  sales_fetched: 'تم جلب المبيعات بنجاح',
  sale_returned: 'تم إرجاع المبيعة بنجاح',
  product_found: 'تم العثور على المنتج',
  
  // Error Messages
  sale_not_found: 'المبيعة غير موجودة',
  sales_fetch_failed: 'فشل في جلب المبيعات',
  sale_create_failed: 'فشل في إنشاء المبيعة',
  sale_update_failed: 'فشل في تحديث المبيعة',
  sale_delete_failed: 'فشل في حذف المبيعة',
  sale_return_failed: 'فشل في إرجاع المبيعة',
  product_not_found: 'المنتج غير موجود أو نفذت الكمية',
  insufficient_stock: 'الكمية المطلوبة غير متوفرة في المخزون',
  invalid_payment_method: 'طريقة الدفع غير صحيحة',
  invalid_payment_status: 'حالة الدفع غير صحيحة',
  invalid_sale_status: 'حالة المبيعة غير صحيحة',
  invalid_sale_item: 'بيانات المنتج في المبيعة غير صحيحة',
  customer_required: 'معرف العميل مطلوب للمبيعات غير المجهولة',
  items_required: 'يجب أن تحتوي المبيعة على منتجات',
  return_items_required: 'يجب تحديد المنتجات المراد إرجاعها',
  return_reason_required: 'سبب الإرجاع مطلوب',
  refund_method_required: 'طريقة الاسترداد مطلوبة',
  invalid_return_quantity: 'كمية الإرجاع تتجاوز الكمية المباعة',
  sale_already_returned: 'المبيعة مرجعة بالفعل',
  sale_cannot_be_returned: 'لا يمكن إرجاع هذه المبيعة',
  
  // Warning Messages
  sale_has_references: 'هذه المبيعة لها مراجع في النظام',
  partial_return_warning: 'سيتم إرجاع المنتجات المحددة فقط',
  stock_adjustment_warning: 'سيتم تعديل المخزون تلقائياً',
  
  // Info Messages
  sale_processing: 'جاري معالجة المبيعة',
  return_processing: 'جاري معالجة الإرجاع',
  stock_updated: 'تم تحديث المخزون',
  
  // Field-specific validation messages
  fields: {
    customer_id: 'معرف العميل',
    invoice_date: 'تاريخ الفاتورة',
    due_date: 'تاريخ الاستحقاق',
    payment_method: 'طريقة الدفع',
    payment_status: 'حالة الدفع',
    paid_amount: 'المبلغ المدفوع',
    total_amount: 'المبلغ الإجمالي',
    discount_amount: 'مبلغ الخصم',
    tax_amount: 'مبلغ الضريبة',
    notes: 'الملاحظات',
    items: 'المنتجات',
    product_id: 'معرف المنتج',
    quantity: 'الكمية',
    price: 'السعر',
    discount_percent: 'نسبة الخصم',
    tax_percent: 'نسبة الضريبة',
    return_reason: 'سبب الإرجاع',
    refund_method: 'طريقة الاسترداد',
    barcode: 'الباركود'
  }
};

// Inventory Messages
const inventoryMessages = {
  // Success Messages
  product_created: 'تم إنشاء المنتج بنجاح',
  product_updated: 'تم تحديث المنتج بنجاح',
  product_deleted: 'تم حذف المنتج بنجاح',
  product_fetched: 'تم جلب المنتج بنجاح',
  products_fetched: 'تم جلب المنتجات بنجاح',
  stock_adjusted: 'تم تعديل المخزون بنجاح',
  backup_created: 'تم إنشاء نسخة احتياطية بنجاح',
  
  // Error Messages
  product_not_found: 'المنتج غير موجود',
  products_fetch_failed: 'فشل في جلب المنتجات',
  product_create_failed: 'فشل في إنشاء المنتج',
  product_update_failed: 'فشل في تحديث المنتج',
  product_delete_failed: 'فشل في حذف المنتج',
  insufficient_stock: 'الكمية المطلوبة غير متوفرة في المخزون',
  sku_already_exists: 'رمز المنتج موجود بالفعل',
  barcode_already_exists: 'الباركود موجود بالفعل',
  product_already_exists: 'المنتج موجود بالفعل',
  product_has_references: 'المنتج مستخدم في عمليات أخرى',
  required_field: 'هذا الحقل مطلوب',
  validation_error: 'خطأ في التحقق من البيانات',
  database_error: 'خطأ في قاعدة البيانات',
  file_not_found: 'الملف غير موجود',
  file_too_large: 'حجم الملف كبير جداً',
  csv_parse_error: 'خطأ في قراءة ملف CSV',
  file_upload_error: 'خطأ في رفع الملف',
  network_error: 'خطأ في الشبكة',
  service_unavailable: 'الخدمة غير متوفرة',
  timeout_error: 'انتهت مهلة الاتصال',
  unauthorized: 'غير مصرح',
  forbidden: 'ممنوع',
  insufficient_permissions: 'صلاحيات غير كافية',
  unknown_error: 'خطأ غير معروف',
  operation_failed: 'فشل في العملية',
  
  // Warning Messages
  product_in_use: 'المنتج مستخدم في عمليات أخرى',
  low_stock_warning: 'المخزون منخفض',
  expiry_warning: 'المنتج قارب على انتهاء الصلاحية',
  
  // Info Messages
  product_processing: 'جاري معالجة المنتج',
  stock_processing: 'جاري تعديل المخزون',
  backup_processing: 'جاري إنشاء النسخة الاحتياطية',
  
  // Field-specific validation messages
  fields: {
    name: 'اسم المنتج',
    description: 'وصف المنتج',
    sku: 'رمز المنتج',
    barcode: 'الباركود',
    purchase_price: 'سعر الشراء',
    selling_price: 'سعر البيع',
    current_stock: 'المخزون الحالي',
    min_stock: 'الحد الأدنى للمخزون',
    unit: 'الوحدة',
    units_per_box: 'الوحدات في الصندوق',
    expiry_date: 'تاريخ الانتهاء',
    supported: 'المنتج مدعوم',
    category_id: 'الفئة',
    supplier_id: 'المورد',
    'name.required': 'اسم المنتج مطلوب',
    'name.invalid': 'اسم المنتج غير صحيح',
    'description.required': 'وصف المنتج مطلوب',
    'description.invalid': 'وصف المنتج غير صحيح',
    'sku.required': 'رمز المنتج مطلوب',
    'sku.invalid': 'رمز المنتج غير صحيح',
    'sku.already_exists': 'رمز المنتج موجود بالفعل',
    'barcode.required': 'الباركود مطلوب',
    'barcode.invalid': 'الباركود غير صحيح',
    'barcode.too_short': 'الباركود يجب أن يكون 8 أرقام على الأقل',
    'barcode.already_exists': 'الباركود موجود بالفعل',
    'purchase_price.required': 'سعر الشراء مطلوب',
    'purchase_price.invalid': 'سعر الشراء غير صحيح',
    'purchase_price.negative': 'سعر الشراء لا يمكن أن يكون سالب',
    'selling_price.required': 'سعر البيع مطلوب',
    'selling_price.invalid': 'سعر البيع غير صحيح',
    'selling_price.negative': 'سعر البيع لا يمكن أن يكون سالب',
    'current_stock.required': 'المخزون الحالي مطلوب',
    'current_stock.invalid': 'المخزون الحالي غير صحيح',
    'current_stock.negative': 'المخزون الحالي لا يمكن أن يكون سالب',
    'min_stock.required': 'الحد الأدنى للمخزون مطلوب',
    'min_stock.invalid': 'الحد الأدنى للمخزون غير صحيح',
    'min_stock.negative': 'الحد الأدنى للمخزون لا يمكن أن يكون سالب',
    'unit.required': 'الوحدة مطلوبة',
    'unit.invalid': 'الوحدة غير صحيحة',
    'units_per_box.required': 'الوحدات في الصندوق مطلوبة',
    'units_per_box.invalid': 'الوحدات في الصندوق غير صحيحة',
    'expiry_date.required': 'تاريخ الانتهاء مطلوب',
    'expiry_date.invalid': 'تاريخ الانتهاء غير صحيح',
    'supported.required': 'حالة الدعم مطلوبة',
    'supported.invalid': 'حالة الدعم غير صحيحة',
    'category_id.required': 'الفئة مطلوبة',
    'category_id.invalid': 'الفئة غير صحيحة',
    'supplier_id.required': 'المورد مطلوب',
    'supplier_id.invalid': 'المورد غير صحيح'
  }
};

// Database backup messages
const databaseMessages = {
  // Success Messages
  backup_created: 'تم إنشاء نسخة احتياطية من قاعدة البيانات بنجاح',
  backup_restored: 'تم استعادة قاعدة البيانات من النسخة الاحتياطية بنجاح',
  database_reset: 'تم إعادة تعيين قاعدة البيانات بنجاح',
  menu_items_fixed: 'تم إصلاح عناصر القائمة بنجاح',
  backups_fetched: 'تم جلب النسخ الاحتياطية بنجاح',
  
  // Error Messages
  backup_failed: 'فشل في إنشاء نسخة احتياطية من قاعدة البيانات',
  restore_failed: 'فشل في استعادة قاعدة البيانات من النسخة الاحتياطية',
  reset_failed: 'فشل في إعادة تعيين قاعدة البيانات',
  backup_not_found: 'ملف النسخة الاحتياطية غير موجود',
  database_busy: 'قاعدة البيانات مشغولة حالياً. يرجى إغلاق جميع العمليات وإعادة المحاولة',
  connection_failed: 'فشل في الاتصال بقاعدة البيانات',
  file_access_error: 'خطأ في الوصول لملف قاعدة البيانات',
  
  // Info Messages
  backup_processing: 'جاري إنشاء نسخة احتياطية...',
  restore_processing: 'جاري استعادة قاعدة البيانات...',
  reset_processing: 'جاري إعادة تعيين قاعدة البيانات...',
  
  // Field-specific messages
  fields: {
    backupId: 'معرف النسخة الاحتياطية',
    backupPath: 'مسار النسخة الاحتياطية',
    dbPath: 'مسار قاعدة البيانات'
  }
};

// Purchase messages
const purchaseMessages = {
  // Success messages
  'purchases_fetched': 'تم جلب المشتريات بنجاح',
  'purchase_fetched': 'تم جلب المشتريات بنجاح',
  'purchase_created': 'تم إنشاء المشتريات بنجاح',
  'purchase_updated': 'تم تحديث المشتريات بنجاح',
  'purchase_deleted': 'تم حذف المشتريات بنجاح',
  'purchase_returned': 'تم إرجاع المشتريات بنجاح',
  'supplier_purchases_fetched': 'تم جلب مشتريات المورد بنجاح',
  'purchase_returns_fetched': 'تم جلب مرتجعات المشتريات بنجاح',
  
  // Error messages
  'purchase_not_found': 'المشتريات غير موجودة',
  'supplier_not_found': 'المورد غير موجود',
  'product_not_found': 'المنتج غير موجود',
  'insufficient_stock': 'الكمية المطلوبة غير متوفرة في المخزون. المتوفر: {available}، المطلوب: {required}',
  'invalid_payment_method': 'طريقة الدفع غير صحيحة',
  'invalid_payment_status': 'حالة الدفع غير صحيحة',
  'invalid_purchase_status': 'حالة المشتريات غير صحيحة',
  'invalid_return_data': 'بيانات الإرجاع غير صحيحة',
  'return_items_required': 'يجب تحديد المنتجات المراد إرجاعها',
  'return_reason_required': 'يجب تحديد سبب الإرجاع',
  'refund_method_required': 'يجب تحديد طريقة الاسترداد',
  'purchase_already_returned': 'تم إرجاع هذه المشتريات مسبقاً',
  'return_quantity_exceeds': 'كمية الإرجاع تتجاوز الكمية المشتراة',
  'supplier_credit_limit_exceeded': 'تجاوز حد الائتمان للمورد. الحد المسموح: {limit}، المطلوب: {amount}',
  'purchase_in_use': 'لا يمكن حذف المشتريات لأنها مستخدمة في عمليات أخرى',
  'purchase_has_returns': 'لا يمكن حذف المشتريات لأن لها مرتجعات',
  'purchase_has_payments': 'لا يمكن حذف المشتريات لأن لها مدفوعات',
  
  // Validation messages
  'fields.supplier_id.required': 'يجب اختيار المورد',
  'fields.invoice_date.required': 'يجب تحديد تاريخ الفاتورة',
  'fields.due_date.required': 'يجب تحديد تاريخ الاستحقاق',
  'fields.items.required': 'يجب إضافة منتج واحد على الأقل',
  'fields.items.min': 'يجب إضافة منتج واحد على الأقل',
  'fields.payment_method.required': 'يجب اختيار طريقة الدفع',
  'fields.payment_status.required': 'يجب اختيار حالة الدفع',
  'fields.status.required': 'يجب اختيار حالة المشتريات',
  'fields.quantity.min': 'الكمية يجب أن تكون أكبر من صفر',
  'fields.price.min': 'السعر يجب أن يكون أكبر من صفر',
  'fields.discount_percent.range': 'نسبة الخصم يجب أن تكون بين 0 و 100',
  'fields.tax_percent.range': 'نسبة الضريبة يجب أن تكون بين 0 و 100',
  'fields.paid_amount.max': 'المبلغ المدفوع لا يمكن أن يتجاوز المجموع الكلي',
  
  // Business logic messages
  'purchase_total_calculation_error': 'خطأ في حساب المجموع الكلي للمشتريات',
  'purchase_payment_calculation_error': 'خطأ في حساب المدفوعات',
  'purchase_inventory_update_error': 'خطأ في تحديث المخزون',
  'purchase_supplier_update_error': 'خطأ في تحديث بيانات المورد',
  'purchase_return_processing_error': 'خطأ في معالجة الإرجاع',
  'purchase_return_inventory_error': 'خطأ في تحديث المخزون عند الإرجاع',
  
  // Database messages
  'purchase_database_error': 'خطأ في قاعدة البيانات أثناء معالجة المشتريات',
  'purchase_constraint_error': 'خطأ في قيود قاعدة البيانات',
  'purchase_foreign_key_error': 'خطأ في العلاقات بين الجداول',
  'purchase_unique_constraint_error': 'رقم الفاتورة موجود مسبقاً',
  
  // File operation messages
  'purchase_export_error': 'خطأ في تصدير بيانات المشتريات',
  'purchase_import_error': 'خطأ في استيراد بيانات المشتريات',
  'purchase_report_error': 'خطأ في إنشاء تقرير المشتريات',
  
  // Network messages
  'purchase_network_error': 'خطأ في الشبكة أثناء معالجة المشتريات',
  'purchase_timeout_error': 'انتهت مهلة الاتصال أثناء معالجة المشتريات',
  
  // Permission messages
  'purchase_unauthorized': 'غير مصرح لك بالوصول إلى المشتريات',
  'purchase_forbidden': 'ممنوع عليك إجراء هذه العملية على المشتريات',
  'purchase_insufficient_permissions': 'صلاحيات غير كافية لمعالجة المشتريات',
  
  // General messages
  'purchase_operation_failed': 'فشل في معالجة المشتريات',
  'purchase_unknown_error': 'خطأ غير معروف في معالجة المشتريات'
};

// Customer messages
const customerMessages = {
  // Success messages
  'customers_fetched': 'تم جلب العملاء بنجاح',
  'customer_fetched': 'تم جلب بيانات العميل بنجاح',
  'customer_created': 'تم إضافة العميل بنجاح',
  'customer_updated': 'تم تحديث بيانات العميل بنجاح',
  'customer_deleted': 'تم حذف العميل بنجاح',
  'customer_details_fetched': 'تم جلب تفاصيل العميل بنجاح',
  'customer_search_completed': 'تم البحث في العملاء بنجاح',
  'customer_sales_fetched': 'تم جلب مبيعات العميل بنجاح',
  
  // Error messages
  'customer_not_found': 'العميل غير موجود',
  'customer_already_exists': 'العميل موجود بالفعل',
  'customer_has_sales': 'لا يمكن حذف العميل لأنه له مبيعات في النظام',
  'customer_has_debts': 'لا يمكن حذف العميل لأنه له ديون في النظام',
  'customer_has_installments': 'لا يمكن حذف العميل لأنه له أقساط في النظام',
  'customer_has_receipts': 'لا يمكن حذف العميل لأنه له إيصالات في النظام',
  'invalid_customer_id': 'معرف العميل غير صحيح',
  'customer_search_failed': 'فشل في البحث عن العملاء',
  'customer_details_failed': 'فشل في جلب تفاصيل العميل',
  
  // Validation messages
  'fields.name.required': 'اسم العميل مطلوب',
  'fields.name.length': 'يجب أن يكون اسم العميل بين 2 و 100 حرف',
  'fields.name.invalid': 'اسم العميل غير صحيح',
  'fields.email.invalid': 'البريد الإلكتروني غير صحيح',
  'fields.email.duplicate': 'البريد الإلكتروني موجود بالفعل',
  'fields.phone.required': 'رقم الهاتف مطلوب',
  'fields.phone.invalid': 'رقم الهاتف غير صحيح (يجب أن يبدأ بـ 07 ويتكون من 11 رقم)',
  'fields.phone.duplicate': 'رقم الهاتف موجود بالفعل',
  'fields.address.length': 'يجب أن يكون العنوان بين 5 و 200 حرف',
  'fields.address.invalid': 'العنوان غير صحيح',
  
  // Business logic messages
  'customer_creation_failed': 'فشل في إنشاء العميل',
  'customer_update_failed': 'فشل في تحديث بيانات العميل',
  'customer_deletion_failed': 'فشل في حذف العميل',
  'customer_search_query_required': 'يجب إدخال نص للبحث',
  'customer_search_no_results': 'لم يتم العثور على عملاء يطابقون البحث',
  
  // Database messages
  'customer_database_error': 'خطأ في قاعدة البيانات أثناء معالجة العميل',
  'customer_constraint_error': 'خطأ في قيود قاعدة البيانات',
  'customer_foreign_key_error': 'خطأ في العلاقات بين الجداول',
  'customer_unique_constraint_error': 'البيانات موجودة بالفعل',
  
  // File operation messages
  'customer_export_error': 'خطأ في تصدير بيانات العملاء',
  'customer_import_error': 'خطأ في استيراد بيانات العملاء',
  'customer_report_error': 'خطأ في إنشاء تقرير العملاء',
  
  // Network messages
  'customer_network_error': 'خطأ في الشبكة أثناء معالجة العميل',
  'customer_timeout_error': 'انتهت مهلة الاتصال أثناء معالجة العميل',
  
  // Permission messages
  'customer_unauthorized': 'غير مصرح لك بالوصول إلى العملاء',
  'customer_forbidden': 'ممنوع عليك إجراء هذه العملية على العملاء',
  'customer_insufficient_permissions': 'صلاحيات غير كافية لمعالجة العملاء',
  
  // General messages
  'customer_operation_failed': 'فشل في معالجة العميل',
  'customer_unknown_error': 'خطأ غير معروف في معالجة العميل'
};

// General error messages
const errorMessages = {
  // Validation errors
  'error.validation_error': 'خطأ في التحقق من البيانات',
  'error.required_field': 'هذا الحقل مطلوب',
  
  // Database errors
  'error.database_error': 'خطأ في قاعدة البيانات',
  'error.sku_already_exists': 'رمز المنتج موجود بالفعل',
  'error.barcode_already_exists': 'الباركود موجود بالفعل',
  'error.product_already_exists': 'المنتج موجود بالفعل',
  'error.product_has_references': 'المنتج مستخدم في عمليات أخرى',
  'error.product_in_use': 'المنتج مستخدم في عمليات أخرى',
  'error.product_not_found': 'المنتج غير موجود',
  'error.insufficient_stock': 'الكمية المطلوبة غير متوفرة في المخزون',
  
  // File errors
  'error.file_not_found': 'الملف غير موجود',
  'error.file_too_large': 'حجم الملف كبير جداً',
  'error.csv_parse_error': 'خطأ في قراءة ملف CSV',
  'error.file_upload_error': 'خطأ في رفع الملف',
  
  // Network errors
  'error.network_error': 'خطأ في الشبكة',
  'error.service_unavailable': 'الخدمة غير متوفرة',
  'error.timeout_error': 'انتهت مهلة الاتصال',
  
  // Permission errors
  'error.unauthorized': 'غير مصرح',
  'error.forbidden': 'ممنوع',
  'error.insufficient_permissions': 'صلاحيات غير كافية',
  
  // General errors
  'error.unknown_error': 'خطأ غير معروف',
  'error.operation_failed': 'فشل في العملية'
};

// Helper function to get message with parameters
function getMessage(messageKey, params = {}) {
  // Check if it's a direct error message
  if (errorMessages[messageKey]) {
    return errorMessages[messageKey];
  }
  
  // Check inventory messages
  if (inventoryMessages[messageKey]) {
    let message = inventoryMessages[messageKey];
    Object.keys(params).forEach(key => {
      message = message.replace(`{${key}}`, params[key]);
    });
    return message;
  }
  
  // Check sales messages
  if (salesMessages[messageKey]) {
    let message = salesMessages[messageKey];
    Object.keys(params).forEach(key => {
      message = message.replace(`{${key}}`, params[key]);
    });
    return message;
  }
  
  // Check purchase messages
  if (purchaseMessages[messageKey]) {
    let message = purchaseMessages[messageKey];
    Object.keys(params).forEach(key => {
      message = message.replace(`{${key}}`, params[key]);
    });
    return message;
  }
  
  // Check customer messages
  if (customerMessages[messageKey]) {
    let message = customerMessages[messageKey];
    Object.keys(params).forEach(key => {
      message = message.replace(`{${key}}`, params[key]);
    });
    return message;
  }
  
  // Check database messages
  if (databaseMessages[messageKey]) {
    let message = databaseMessages[messageKey];
    Object.keys(params).forEach(key => {
      message = message.replace(`{${key}}`, params[key]);
    });
    return message;
  }
  
  // Check general messages with dot notation
  const keys = messageKey.split('.');
  let message = arabicMessages;
  
  for (const k of keys) {
    if (message && typeof message === 'object' && k in message) {
      message = message[k];
    } else {
      return messageKey; // Return the key if path not found
    }
  }
  
  if (typeof message === 'string') {
    // Replace parameters in the message
    return Object.keys(params).reduce((msg, param) => {
      return msg.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    }, message);
  }
  
  // Return the key if no message found
  return messageKey;
}

// Helper function to get error message with context
const getErrorMessage = (errorType, context = {}) => {
  const baseMessage = getMessage(`error.${errorType}`);
  
  if (context.productName) {
    return `${baseMessage}: ${context.productName}`;
  }
  
  if (context.available && context.required) {
    return `${baseMessage}. المتاح: ${context.available}, المطلوب: ${context.required}`;
  }
  
  if (context.count) {
    return `${baseMessage} (${context.count} مرجع)`;
  }
  
  return baseMessage;
};

// Helper function to get reference message
const getReferenceMessage = (references) => {
  if (!references || Object.keys(references).length === 0) {
    return '';
  }

  const referenceTypes = [];
  let totalCount = 0;

  Object.entries(references).forEach(([type, count]) => {
    if (count > 0) {
      const arabicType = arabicMessages.references[type] || type;
      referenceTypes.push(`${arabicType}: ${count}`);
      totalCount += count;
    }
  });

  return `المراجع: ${referenceTypes.join(', ')} (الإجمالي: ${totalCount})`;
};

module.exports = {
  arabicMessages,
  getMessage,
  getErrorMessage,
  getReferenceMessage,
  salesMessages,
  inventoryMessages,
  databaseMessages,
  purchaseMessages,
  customerMessages,
  errorMessages
}; 