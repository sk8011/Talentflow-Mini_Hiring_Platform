import React from 'react'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card'
import { AlertCircle } from 'lucide-react'

export default function ConfirmDialog({ open, title = 'Confirm', message, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <Card className="w-full max-w-md mx-4 shadow-lg animate-in zoom-in-95 duration-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>This action requires confirmation</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{message}</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Confirm
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
