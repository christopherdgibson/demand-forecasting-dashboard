import './styles.css';
import '../../App/styles.css';
import { Dispatch, SetStateAction, useState } from 'react';

import type { ErrorMessage } from '../../types';

interface ErrorModalProps {
    activeModal: boolean
    setActiveModal: Dispatch<SetStateAction<boolean>>;
	error: ErrorMessage;
}

export function ErrorModal({ activeModal, setActiveModal, error }: ErrorModalProps) {
	const [showDetails, setShowDetails] = useState(false);

	return (
		<div
			className={activeModal ? 'modal-overlay active' : 'modal-overlay'}
			onClick={() => setActiveModal(false)}
		>
			<div className="modal-card" onClick={(e) => {e.stopPropagation()}}> {/* Allow click on card without closing */}
				<div className="page-tag-close-container">
					<h3 className={"modal-header"}>{error.header}</h3>
					<div
						className="page-tag page-tag-close page-tag-close-right"
						onClick={() => setActiveModal(false)}
					>
						✕ Close
					</div>
				</div>
				<p className={'modal-title'}>{error.message}</p>

				{error.trace && (
					<>
						<button className={'trace-button'}
        					onClick={() => setShowDetails(prev => !prev)}
						>
							{showDetails ? 'Hide details' : 'Show details'}
							<svg className={showDetails ? 'dropdown-arrow expanded' : 'dropdown-arrow'} viewBox="0 0 12 12">
								<path d="M2 4l4 5 4-5"/>
							</svg>
						</button>
						<div className={showDetails ? 'modal-footer expanded' : 'modal-footer'}>
							{<pre className={'modal-footer-note'}>{error.trace}</pre>}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
