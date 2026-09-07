'use client';

/**
 * Transaction History Component
 *
 * Displays transaction history with filtering and detailed audit trails
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/financial/employment-calculator';
import { format } from 'date-fns';
import {
  AlertCircle,
  CreditCard,
  DollarSign,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Transaction {
  id: string;
  businessId: string;
  businessName: string;
  appointmentId?: string;
  staffId?: string;
  staffName?: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  paymentId?: string;
  description?: string;
  staffEmploymentType?: string;
  commissionRate?: number;
  commissionAmount?: number;
  chairRentalApplicable: boolean;
  createdAt: string;
  updatedAt: string;
  appointment?: {
    id: string;
    startTime: string;
    endTime: string;
    clientName?: string;
    services: Array<{
      serviceName: string;
      price: number;
    }>;
  };
  metadata?: any;
}

interface TransactionHistoryProps {
  businessId?: string;
  staffId?: string;
  showFilters?: boolean;
  maxItems?: number;
}

const TRANSACTION_TYPES = [
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'REFUND', label: 'Refund' },
  { value: 'COMMISSION', label: 'Commission' },
  { value: 'CHAIR_RENTAL', label: 'Chair Rental' },
  { value: 'TIP', label: 'Tip' },
  { value: 'DEPOSIT', label: 'Deposit' },
];

const TRANSACTION_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const EMPLOYMENT_TYPES = [
  { value: 'COMMISSION', label: 'Commission' },
  { value: 'CHAIR_RENTAL', label: 'Chair Rental' },
  { value: 'HYBRID', label: 'Hybrid' },
];

export default function TransactionHistory({
  businessId,
  staffId,
  showFilters = true,
  maxItems,
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string>('');
  const [startDate] = useState<string>('');
  const [endDate] = useState<string>('');

  const fetchTransactions = async (page = 1) => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: (maxItems || 50).toString(),
        ...(businessId && { businessId }),
        ...(staffId && { staffId }),
        ...(typeFilter && { type: typeFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(employmentTypeFilter && { employmentType: employmentTypeFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await fetch(`/api/transactions?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions);
      setTotalCount(data.total);
      setCurrentPage(data.page);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch transactions'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [
    businessId,
    staffId,
    typeFilter,
    statusFilter,
    employmentTypeFilter,
    startDate,
    endDate,
  ]);

  const handleRefresh = () => {
    fetchTransactions(currentPage);
  };

  const handlePageChange = (page: number) => {
    fetchTransactions(page);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'PROCESSING':
        return 'outline';
      case 'FAILED':
        return 'destructive';
      case 'CANCELLED':
        return 'secondary';
      case 'REFUNDED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return <CreditCard className="h-4 w-4" />;
      case 'REFUND':
        return <RefreshCw className="h-4 w-4" />;
      case 'COMMISSION':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const filteredTransactions = transactions.filter(
    transaction =>
      searchTerm === '' ||
      transaction.description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transaction.staffName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.appointment?.clientName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>{totalCount} transactions found</CardDescription>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {TRANSACTION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {TRANSACTION_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={employmentTypeFilter}
              onValueChange={setEmploymentTypeFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Employment Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Employment Types</SelectItem>
                {EMPLOYMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading transactions...</span>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-8 text-center">
            <DollarSign className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map(transaction => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="text-sm">
                          {format(
                            new Date(transaction.createdAt),
                            'MMM dd, yyyy'
                          )}
                          <div className="text-xs text-gray-500">
                            {format(new Date(transaction.createdAt), 'HH:mm')}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(transaction.type)}
                          <span className="text-sm">{transaction.type}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="max-w-xs">
                          <p className="truncate text-sm font-medium">
                            {transaction.description}
                          </p>
                          {transaction.appointment?.clientName && (
                            <p className="text-xs text-gray-500">
                              Client: {transaction.appointment.clientName}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">
                          {transaction.staffName && (
                            <>
                              <p>{transaction.staffName}</p>
                              {transaction.staffEmploymentType && (
                                <Badge variant="outline" className="text-xs">
                                  {transaction.staffEmploymentType}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm font-medium">
                          {formatCurrency(transaction.amount)}
                        </div>
                      </TableCell>

                      <TableCell>
                        {transaction.commissionAmount && (
                          <div className="text-sm">
                            {formatCurrency(transaction.commissionAmount)}
                            {transaction.commissionRate && (
                              <div className="text-xs text-gray-500">
                                ({transaction.commissionRate}%)
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(transaction.status)}
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * (maxItems || 50) + 1} to{' '}
                  {Math.min(currentPage * (maxItems || 50), totalCount)} of{' '}
                  {totalCount} transactions
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
