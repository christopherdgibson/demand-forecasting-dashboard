import { Dispatch, SetStateAction, useEffect, useId, useRef, useState } from 'react';

import './styles.css';
import type { ErrorMessage } from '../../types';

interface ErrorModalProps {
	activeModal: boolean;
	setActiveModal: Dispatch<SetStateAction<boolean>>;
	error: ErrorMessage;
}

export function ErrorModal({ activeModal, setActiveModal, error }: ErrorModalProps) {
	const [showDetails, setShowDetails] = useState(false);
	const closeRef = useRef<HTMLButtonElement>(null);
	const titleId = useId();
	const detailsId = useId();

	useEffect(() => {
		if (!activeModal) return;
		closeRef.current?.focus();

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setActiveModal(false);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [activeModal, setActiveModal]);

	return (
		<div
			className={activeModal ? 'modal-overlay active' : 'modal-overlay'}
			onClick={() => setActiveModal(false)}
		>
			<div
				className="modal-card"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={titleId}
				onClick={(e) => e.stopPropagation()}  /* Allow click on card without closing */
			>
				<div className="modal-head">
					<span className="modal-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
							strokeLinecap="round" strokeLinejoin="round">
						<path d="M12 9v4M12 17h.01" />
						<path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
						</svg>
					</span>
					<h3 id={titleId} className="modal-title">{error.header ?? error.type}</h3>
					<button
						ref={closeRef}
						className="modal-close"
						onClick={() => setActiveModal(false)}
						aria-label="Close"
					>
						<svg viewBox="0 0 12 12" aria-hidden="true">
							<path d="M2 2l8 8M10 2l-8 8" />
						</svg>
					</button>
				</div>

				<p className="modal-message">{error.message}</p>

				{error.trace && (
					<>
						<button
							className="trace-button"
							onClick={() => setShowDetails((s) => !s)}
							aria-expanded={showDetails}
							aria-controls={detailsId}
						>
							{showDetails ? 'Hide details' : 'Show details'}
							<svg
								className={showDetails ? 'dropdown-arrow expanded' : 'dropdown-arrow'}
								viewBox="0 0 12 12"
								aria-hidden="true"
							>
								<path d="M2 4l4 5 4-5" />
							</svg>
						</button>

						<div
							id={detailsId}
							className={showDetails ? 'modal-details expanded' : 'modal-details'}
						>
							<div className="modal-details-inner">
								<pre className="modal-trace">{error.trace}</pre>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
