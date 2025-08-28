import React from 'react';
import { useBackupNotification } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Download, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BackupNotification: React.FC = () => {
  const { showBackupReminder, dismissBackupReminder, performBackup } = useBackupNotification();

  if (!showBackupReminder) {
    return null;
  }

  return (
    <AnimatePresence>
      {/* Overlay backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998]"
        onClick={dismissBackupReminder}
      />
      
      {/* Notification card */}
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        transition={{ 
          duration: 0.4, 
          type: "spring",
          damping: 25,
          stiffness: 300
        }}
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[99999] w-full max-w-lg px-4"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the card
      >
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-highlight/5 shadow-2xl backdrop-blur-sm ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="p-2 rounded-full bg-primary/10 ring-2 ring-primary/20">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-primary text-xl font-bold">تذكير النسخ الاحتياطي</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismissBackupReminder}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 rounded-full ring-2 ring-transparent hover:ring-destructive/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription className="text-foreground/90 mb-6">
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-3">
                <div className="p-1 rounded-full bg-highlight/10">
                  <Clock className="h-4 w-4 text-highlight" />
                </div>
                <span className="font-semibold text-lg">حان وقت إنشاء نسخة احتياطية من قاعدة البيانات</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50">
                للحفاظ على أمان بياناتك، يُنصح بإنشاء نسخة احتياطية يومياً في تمام الساعة 12 ظهراً.
              </p>
            </CardDescription>
            
            <div className="flex gap-3">
              <Button
                onClick={performBackup}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 ring-2 ring-transparent hover:ring-primary/30"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                إنشاء نسخة احتياطية الآن
              </Button>
              <Button
                variant="outline"
                onClick={dismissBackupReminder}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 hover:border-primary/30 hover:scale-105"
                size="sm"
              >
                تذكيري لاحقاً
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default BackupNotification;
