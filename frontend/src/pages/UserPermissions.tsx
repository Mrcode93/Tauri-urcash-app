import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../app/store';
import { 
  getUserPermissions, 
  getAllPermissions, 
  grantPermission, 
  revokePermission,
  selectUserPermissions,
  selectAllPermissions,
  selectPermissionsLoading,
  selectPermissionsError,
  selectHasPermission
} from '../features/auth/authSlice';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Shield, User, Users } from 'lucide-react';

const UserPermissions: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [selectedPermission, setSelectedPermission] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  const userPermissions = useSelector(selectUserPermissions);
  const allPermissions = useSelector(selectAllPermissions);
  const loading = useSelector(selectPermissionsLoading);
  const error = useSelector(selectPermissionsError);
  const hasPermissionManagement = useSelector(selectHasPermission('users.permissions'));

  useEffect(() => {
    if (hasPermissionManagement) {
      dispatch(getAllPermissions());
      dispatch(getUserPermissions(selectedUserId));
    }
  }, [dispatch, hasPermissionManagement, selectedUserId]);

  const handleGrantPermission = async () => {
    if (!selectedUserId || !selectedPermission) return;
    
    try {
      await dispatch(grantPermission({
        userId: selectedUserId,
        permissionData: {
          permission_id: selectedPermission,
          expires_at: expiresAt || undefined
        }
      }));
      
      // Refresh user permissions
      dispatch(getUserPermissions(selectedUserId));
      
      // Reset form
      setSelectedPermission('');
      setExpiresAt('');
    } catch (error) {
      console.error('Failed to grant permission:', error);
    }
  };

  const handleRevokePermission = async (permissionId: string) => {
    if (!selectedUserId) return;
    
    try {
      await dispatch(revokePermission({
        userId: selectedUserId,
        permissionId
      }));
      
      // Refresh user permissions
      dispatch(getUserPermissions(selectedUserId));
    } catch (error) {
      console.error('Failed to revoke permission:', error);
    }
  };

  const groupPermissionsByCategory = (permissions: any[]) => {
    return permissions.reduce((groups, permission) => {
      const category = permission.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(permission);
      return groups;
    }, {});
  };

  if (!hasPermissionManagement) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to manage user permissions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading permissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Permissions Management</h1>
        <p className="text-muted-foreground">
          Manage user permissions and role-based access control
        </p>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="current-user" className="space-y-6">
        <TabsList>
          <TabsTrigger value="current-user">
            <User className="h-4 w-4 mr-2" />
            My Permissions
          </TabsTrigger>
          <TabsTrigger value="manage-users">
            <Users className="h-4 w-4 mr-2" />
            Manage User Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current-user" className="space-y-6">
          {userPermissions && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>My Role: {userPermissions.role}</CardTitle>
                  <CardDescription>
                    You have {userPermissions.allPermissions.length} total permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(groupPermissionsByCategory(userPermissions.allPermissions)).map(([category, permissions]: [string, any]) => (
                      <Card key={category}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg capitalize">{category}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {permissions.map((permission: any) => (
                              <div key={permission.permission_id} className="flex items-center justify-between">
                                <span className="text-sm">{permission.name}</span>
                                <Badge variant={permission.source === 'role' ? 'default' : 'secondary'}>
                                  {permission.source === 'role' ? 'Role' : 'Custom'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="manage-users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Grant Permission to User</CardTitle>
              <CardDescription>
                Grant additional permissions to a specific user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">User ID</label>
                  <input
                    type="number"
                    value={selectedUserId || ''}
                    onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full p-2 border rounded-md"
                    placeholder="Enter user ID"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Permission</label>
                  <select
                    value={selectedPermission}
                    onChange={(e) => setSelectedPermission(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select permission</option>
                    {allPermissions.map((permission) => (
                      <option key={permission.permission_id} value={permission.permission_id}>
                        {permission.name} ({permission.permission_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Expires At (Optional)</label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>
              <Button 
                onClick={handleGrantPermission}
                disabled={!selectedUserId || !selectedPermission}
              >
                Grant Permission
              </Button>
            </CardContent>
          </Card>

          {userPermissions && (
            <Card>
              <CardHeader>
                <CardTitle>User Permissions</CardTitle>
                <CardDescription>
                  Current permissions for user {selectedUserId}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userPermissions.customPermissions.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Custom Permissions</h3>
                      <div className="space-y-2">
                        {userPermissions.customPermissions.map((permission: any) => (
                          <div key={permission.permission_id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <span className="font-medium">{permission.name}</span>
                              <p className="text-sm text-muted-foreground">{permission.description}</p>
                              {permission.expires_at && (
                                <p className="text-xs text-muted-foreground">
                                  Expires: {new Date(permission.expires_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRevokePermission(permission.permission_id)}
                            >
                              Revoke
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">Role-Based Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(groupPermissionsByCategory(userPermissions.rolePermissions)).map(([category, permissions]: [string, any]) => (
                        <Card key={category}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm capitalize">{category}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1">
                              {permissions.map((permission: any) => (
                                <div key={permission.permission_id} className="text-sm">
                                  {permission.name}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserPermissions; 