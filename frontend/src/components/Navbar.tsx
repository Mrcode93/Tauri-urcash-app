import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../app/store';
import { logout } from '../features/auth/authSlice';
import { LogOut, Menu, User, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../../assets/logo.png';
import NotificationIcon from './DebtNotificationIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <header className="bg-primary-foreground text-primary border-b shadow-md z-50 border-gray-300  h-16">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="text-primary-foreground hover:text-primary-foreground/80 focus:outline-none md:hidden transition-colors"
          >
            <Menu className='w-8 h-8' />
          </button>
        </div>
        <div className="flex items-center gap-2 justify-center">
          <img src={Logo} alt="Logo" className='w-40' />
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground">© 2025 URUX</span>
            <a href="https://urux.guru" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
              www.urux.com
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <NotificationIcon />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <UserCircle className='w-8 h-8 cursor-pointer bg-primary-foreground text-primary rounded-full p-1 hover:bg-primary-foreground/90 transition-colors' />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user?.role === 'admin' && (
                <DropdownMenuItem asChild>
                  <Link to="/admin-profiles" className="cursor-pointer flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>إدارة المشرفين</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-6 w-6" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
