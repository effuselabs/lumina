'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DashboardAppointment } from '@/types/dashboard-appointments';
import {
    Clock,
    Edit,
    Lock,
    MessageSquare,
    Plus,
    Save,
    Trash2,
    X
} from 'lucide-react';
import { useState } from 'react';

export interface AppointmentNote {
    id: string;
    content: string;
    isInternal: boolean; // Staff-only notes vs client-visible notes
    createdAt: Date;
    updatedAt?: Date;
    author: {
        id: string;
        name: string;
        avatar?: string;
        role: string;
    };
}

export interface AppointmentNotesProps {
    appointment: DashboardAppointment;
    onNotesUpdate: (notes: string) => Promise<void>;
    onAddNote?: (note: Omit<AppointmentNote, 'id' | 'createdAt'>) => Promise<void>;
    onUpdateNote?: (noteId: string, content: string) => Promise<void>;
    onDeleteNote?: (noteId: string) => Promise<void>;
    currentUser?: {
        id: string;
        name: string;
        avatar?: string;
        role: string;
    };
}

/**
 * AppointmentNotes Component
 * 
 * Manages appointment notes and comments with staff attribution.
 * Supports both client-visible and internal staff-only notes.
 * 
 * Requirements: 3.5, 3.7
 */
export function AppointmentNotes({
    appointment,
    onNotesUpdate,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    currentUser = {
        id: 'current-user',
        name: 'Current User',
        role: 'Staff',
    },
}: AppointmentNotesProps) {
    const [isEditingMainNotes, setIsEditingMainNotes] = useState(false);
    const [mainNotes, setMainNotes] = useState(appointment.notes || '');
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [newNoteIsInternal, setNewNoteIsInternal] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingNoteContent, setEditingNoteContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Mock notes data - in real implementation, this would come from props or API
    const [notes, setNotes] = useState<AppointmentNote[]>([
        {
            id: '1',
            content: 'Client prefers shorter haircuts and is sensitive to heat styling.',
            isInternal: false,
            createdAt: new Date(Date.now() - 86400000), // 1 day ago
            author: {
                id: 'staff-1',
                name: 'Sarah Johnson',
                avatar: undefined,
                role: 'Senior Stylist',
            },
        },
        {
            id: '2',
            content: 'Client was 15 minutes late for last appointment. Consider confirming arrival time.',
            isInternal: true,
            createdAt: new Date(Date.now() - 3600000), // 1 hour ago
            author: {
                id: 'staff-2',
                name: 'Mike Chen',
                avatar: undefined,
                role: 'Manager',
            },
        },
    ]);

    const formatDateTime = (date: Date): string => {
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            const diffInMinutes = Math.floor(diffInHours * 60);
            return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffInHours < 24) {
            const hours = Math.floor(diffInHours);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        }
    };

    const getInitials = (name: string): string => {
        return name
            .split(' ')
            .map(part => part.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleSaveMainNotes = async () => {
        setIsLoading(true);
        try {
            await onNotesUpdate(mainNotes);
            setIsEditingMainNotes(false);
        } catch (error) {
            console.error('Failed to update notes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelMainNotes = () => {
        setMainNotes(appointment.notes || '');
        setIsEditingMainNotes(false);
    };

    const handleAddNote = async () => {
        if (!newNoteContent.trim() || !onAddNote) return;

        setIsLoading(true);
        try {
            await onAddNote({
                content: newNoteContent,
                isInternal: newNoteIsInternal,
                author: currentUser,
            });

            // Add to local state (in real implementation, this would be handled by parent)
            const newNote: AppointmentNote = {
                id: Date.now().toString(),
                content: newNoteContent,
                isInternal: newNoteIsInternal,
                createdAt: new Date(),
                author: currentUser,
            };
            setNotes(prev => [newNote, ...prev]);

            setNewNoteContent('');
            setNewNoteIsInternal(false);
            setIsAddingNote(false);
        } catch (error) {
            console.error('Failed to add note:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditNote = (note: AppointmentNote) => {
        setEditingNoteId(note.id);
        setEditingNoteContent(note.content);
    };

    const handleSaveEditedNote = async () => {
        if (!editingNoteId || !onUpdateNote) return;

        setIsLoading(true);
        try {
            await onUpdateNote(editingNoteId, editingNoteContent);

            // Update local state
            setNotes(prev => prev.map(note =>
                note.id === editingNoteId
                    ? { ...note, content: editingNoteContent, updatedAt: new Date() }
                    : note
            ));

            setEditingNoteId(null);
            setEditingNoteContent('');
        } catch (error) {
            console.error('Failed to update note:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!onDeleteNote) return;

        setIsLoading(true);
        try {
            await onDeleteNote(noteId);
            setNotes(prev => prev.filter(note => note.id !== noteId));
        } catch (error) {
            console.error('Failed to delete note:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const canEditNote = (note: AppointmentNote): boolean => {
        return note.author.id === currentUser.id || currentUser.role === 'Manager';
    };

    return (
        <div className="space-y-6">
            {/* Main Appointment Notes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <MessageSquare className="h-5 w-5" />
                            <span>Appointment Notes</span>
                        </div>
                        {!isEditingMainNotes && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditingMainNotes(true)}
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isEditingMainNotes ? (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="mainNotes">Notes</Label>
                                <Textarea
                                    id="mainNotes"
                                    value={mainNotes}
                                    onChange={(e) => setMainNotes(e.target.value)}
                                    placeholder="Add notes about this appointment..."
                                    rows={4}
                                    className="mt-2"
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <Button
                                    variant="outline"
                                    onClick={handleCancelMainNotes}
                                    disabled={isLoading}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveMainNotes}
                                    disabled={isLoading}
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {isLoading ? 'Saving...' : 'Save Notes'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {appointment.notes ? (
                                <p className="text-gray-700 whitespace-pre-wrap">{appointment.notes}</p>
                            ) : (
                                <p className="text-gray-500 italic">No notes added yet.</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Comments/Notes Thread */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <MessageSquare className="h-5 w-5" />
                            <span>Comments & Notes</span>
                            <Badge variant="secondary">{notes.length}</Badge>
                        </div>
                        {onAddNote && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddingNote(true)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Note
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add New Note Form */}
                    {isAddingNote && (
                        <Card className="border-dashed">
                            <CardContent className="pt-4">
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="newNote">Add a note or comment</Label>
                                        <Textarea
                                            id="newNote"
                                            value={newNoteContent}
                                            onChange={(e) => setNewNoteContent(e.target.value)}
                                            placeholder="Type your note here..."
                                            rows={3}
                                            className="mt-2"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="isInternal"
                                            checked={newNoteIsInternal}
                                            onChange={(e) => setNewNoteIsInternal(e.target.checked)}
                                            className="rounded"
                                        />
                                        <Label htmlFor="isInternal" className="flex items-center space-x-1">
                                            <Lock className="h-3 w-3" />
                                            <span>Internal note (staff only)</span>
                                        </Label>
                                    </div>
                                    <div className="flex justify-end space-x-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsAddingNote(false);
                                                setNewNoteContent('');
                                                setNewNoteIsInternal(false);
                                            }}
                                            disabled={isLoading}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleAddNote}
                                            disabled={isLoading || !newNoteContent.trim()}
                                        >
                                            {isLoading ? 'Adding...' : 'Add Note'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Notes List */}
                    <div className="space-y-4">
                        {notes.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No comments or notes yet.</p>
                            </div>
                        ) : (
                            notes.map((note) => (
                                <Card key={note.id} className={cn(
                                    'relative',
                                    note.isInternal && 'border-orange-200 bg-orange-50/50'
                                )}>
                                    <CardContent className="pt-4">
                                        <div className="flex items-start space-x-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={note.author.avatar} alt={note.author.name} />
                                                <AvatarFallback className="text-xs">
                                                    {getInitials(note.author.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center space-x-2">
                                                        <p className="font-medium text-sm">{note.author.name}</p>
                                                        <Badge variant="outline" className="text-xs">
                                                            {note.author.role}
                                                        </Badge>
                                                        {note.isInternal && (
                                                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                                                                <Lock className="h-2 w-2 mr-1" />
                                                                Internal
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{formatDateTime(note.createdAt)}</span>
                                                            {note.updatedAt && (
                                                                <span className="text-gray-400">(edited)</span>
                                                            )}
                                                        </div>
                                                        {canEditNote(note) && (
                                                            <div className="flex items-center space-x-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleEditNote(note)}
                                                                    className="h-6 w-6 p-0"
                                                                >
                                                                    <Edit className="h-3 w-3" />
                                                                </Button>
                                                                {onDeleteNote && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleDeleteNote(note.id)}
                                                                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {editingNoteId === note.id ? (
                                                    <div className="space-y-3">
                                                        <Textarea
                                                            value={editingNoteContent}
                                                            onChange={(e) => setEditingNoteContent(e.target.value)}
                                                            rows={3}
                                                        />
                                                        <div className="flex justify-end space-x-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setEditingNoteId(null);
                                                                    setEditingNoteContent('');
                                                                }}
                                                                disabled={isLoading}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={handleSaveEditedNote}
                                                                disabled={isLoading || !editingNoteContent.trim()}
                                                            >
                                                                {isLoading ? 'Saving...' : 'Save'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                        {note.content}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}