import React, { createContext, useContext, useMemo, useRef, useState } from 'react'

const DialogContext = createContext(null)

function DialogModal({ dialog, onResolve }) {
  if (!dialog) {
    return null
  }

  const isConfirm = dialog.type === 'confirm'

  return (
    <div className="modal">
      <div className="modal-content dialog-modal">
        <div className="modal-header">
          <h2>{dialog.title}</h2>
          <button className="close-btn" onClick={() => onResolve(false)}>×</button>
        </div>

        <div className="dialog-body">
          <p>{dialog.message}</p>
        </div>

        <div className="actions dialog-actions">
          {isConfirm ? (
            <>
              <button className="btn btn-primary" onClick={() => onResolve(true)}>
                Да
              </button>
              <button className="btn btn-secondary" onClick={() => onResolve(false)}>
                Нет
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => onResolve(true)}>
              Понятно
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolverRef = useRef(null)

  const closeDialog = (value) => {
    const resolver = resolverRef.current
    resolverRef.current = null
    setDialog(null)
    resolver?.(value)
  }

  const showDialog = (nextDialog) => new Promise((resolve) => {
    resolverRef.current = resolve
    setDialog(nextDialog)
  })

  const value = useMemo(() => ({
    alert: (message, title = 'Сообщение') => showDialog({ type: 'alert', title, message }),
    confirm: (message, title = 'Подтверждение') => showDialog({ type: 'confirm', title, message }),
  }), [])

  return (
    <DialogContext.Provider value={value}>
      {children}
      <DialogModal dialog={dialog} onResolve={closeDialog} />
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider')
  }
  return context
}
